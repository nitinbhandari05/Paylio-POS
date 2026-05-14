import crypto from "node:crypto";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import { inventoryService } from "./inventory.service.js";
import { invoiceQueue } from "../jobs/queues.js";
import { emitNewOrder, emitOrderCompleted } from "../sockets/index.js";
import { AppError } from "../utils/AppError.js";
import { cacheService } from "./cache.service.js";

const money = (value) => Math.round(Number(value || 0) * 100) / 100;
const orderNumber = () => `ORD-${Date.now()}-${crypto.randomInt(1000, 9999)}`;

const calculateDiscount = (coupon, subtotal) => {
  if (!coupon) return 0;
  if (coupon.expiryDate < new Date() || !coupon.isActive) throw new AppError("Coupon expired or inactive", 400);
  if (coupon.usedCount >= coupon.usageLimit) throw new AppError("Coupon usage limit exceeded", 400);
  if (subtotal < coupon.minimumOrderValue) throw new AppError("Minimum order value not met", 400);
  return coupon.discountType === "percentage"
    ? money((subtotal * coupon.discountValue) / 100)
    : Math.min(coupon.discountValue, subtotal);
};

export const orderService = {
  async create(payload, cashierId) {
    const session = await mongoose.startSession();
    try {
      let createdOrder;
      await session.withTransaction(async () => {
        const productIds = payload.items.map((item) => item.productId);
        const products = await Product.find({ _id: { $in: productIds }, status: "active" }).session(session);
        const productMap = new Map(products.map((product) => [String(product._id), product]));
        if (products.length !== productIds.length) throw new AppError("One or more products are invalid", 400);

        const items = payload.items.map((item) => {
          const product = productMap.get(String(item.productId));
          const quantity = Number(item.quantity);
          const lineBase = money(quantity * product.price);
          const lineTax = money((lineBase * product.taxPercentage) / 100);
          return {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            quantity,
            unitPrice: product.price,
            taxPercentage: product.taxPercentage,
            lineTotal: money(lineBase + lineTax),
          };
        });
        const subtotal = money(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
        const coupon = payload.couponCode
          ? await Coupon.findOne({ code: String(payload.couponCode).toUpperCase() }).session(session)
          : null;
        const couponDiscount = calculateDiscount(coupon, subtotal);
        const manualDiscount = money(payload.discount || 0);
        const discount = money(couponDiscount + manualDiscount);
        const taxAmount = money(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxPercentage) / 100, 0));
        const grandTotal = money(Math.max(0, subtotal - discount + taxAmount));

        const [order] = await Order.create(
          [{
            orderNumber: orderNumber(),
            customerId: payload.customerId,
            cashierId,
            items,
            subtotal,
            discount,
            couponCode: coupon?.code,
            taxAmount,
            grandTotal,
            paymentMethod: payload.paymentMethod || "cash",
          }],
          { session }
        );

        for (const item of items) {
          await inventoryService.adjust({
            productId: item.productId,
            quantity: item.quantity,
            operationType: "SALE",
            reason: `Order ${order.orderNumber}`,
            userId: cashierId,
            session,
          });
        }
        if (coupon) {
          coupon.usedCount += 1;
          await coupon.save({ session });
        }
        if (payload.customerId) {
          await Customer.findByIdAndUpdate(
            payload.customerId,
            { $inc: { totalSpent: grandTotal, loyaltyPoints: Math.floor(grandTotal / 100) } },
            { session }
          );
        }
        createdOrder = order;
      });
      emitNewOrder(createdOrder);
      await invoiceQueue.add("send-invoice", { orderId: createdOrder._id.toString() });
      await cacheService.del("dashboard:*");
      await cacheService.del("reports:*");
      return createdOrder.populate("customerId cashierId items.productId");
    } finally {
      await session.endSession();
    }
  },
  async list(query = {}) {
    const filter = {};
    if (query.status) filter.orderStatus = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    return Order.find(filter).populate("customerId cashierId").sort("-createdAt").limit(100);
  },
  async get(id) {
    const order = await Order.findById(id).populate("customerId cashierId items.productId");
    if (!order) throw new AppError("Order not found", 404);
    return order;
  },
  async updateStatus(id, status) {
    const order = await Order.findByIdAndUpdate(id, { orderStatus: status }, { new: true, runValidators: true });
    if (!order) throw new AppError("Order not found", 404);
    if (status === "completed") emitOrderCompleted(order);
    await cacheService.del("dashboard:*");
    return order;
  },
  async cancel(id, userId) {
    const order = await this.get(id);
    if (["completed", "cancelled", "refunded"].includes(order.orderStatus)) throw new AppError("Order cannot be cancelled", 400);
    await inventoryService.withTransaction(async (session) => {
      for (const item of order.items) {
        await inventoryService.adjust({ productId: item.productId, quantity: item.quantity, operationType: "RETURN", reason: `Cancel ${order.orderNumber}`, userId, session });
      }
      order.orderStatus = "cancelled";
      await order.save({ session });
    });
    return order;
  },
  async markPaid(orderId, payment) {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: "paid", paymentMethod: payment.gateway },
      { new: true }
    );
    return order;
  },
};
