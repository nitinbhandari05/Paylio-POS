import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";
import { roundMoney } from "../utils/format.js";
import { generateInvoiceNumber, generateRefundNumber } from "../utils/invoice.js";
import Cart from "./cart.model.js";
import Inventory from "./inventory.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/orders.json"));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const findOrder = async (orderId) => {
  const orders = await store.read();
  return orders.find((item) => item._id === String(orderId)) || null;
};

const saveOrder = async (order) => {
  const orders = await store.read();
  const index = orders.findIndex((item) => item._id === order._id);

  if (index === -1) {
    orders.push(order);
  } else {
    orders[index] = order;
  }

  await store.write(orders);
  return order;
};

const changeOrderStock = async (order, type, notePrefix) => {
  for (const item of order.items || []) {
    await Inventory.createMovement({
      productId: item.productId,
      quantity: item.quantity,
      type,
      note: `${notePrefix} ${order.invoiceNumber}`,
    });
  }
};

const Order = {
  list: async () => store.read(),

  findOne: async (query = {}) => {
    const orders = await store.read();

    if (query._id) {
      return orders.find((item) => item._id === String(query._id)) || null;
    }

    if (query.invoiceNumber) {
      return orders.find((item) => item.invoiceNumber === query.invoiceNumber) || null;
    }

    return orders.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  createFromCart: async (cartId, payload = {}) => {
    const cart = await Cart.findOne({ _id: cartId });
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (!cart.items.length) {
      throw new Error("Cart is empty");
    }

    if (cart.status !== "open") {
      throw new Error("Cart is already closed");
    }

    const now = new Date().toISOString();
    const invoiceNumber = await generateInvoiceNumber();
    const items = cart.items.map((item) => ({
      _id: randomUUID(),
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountType: item.discountType || "flat",
      discountValue: toNumber(item.discountValue, 0),
      gstRate: toNumber(item.effectiveGstRate || item.gstRate, 0),
      lineSubtotal: roundMoney(item.lineSubtotal ?? item.unitPrice * item.quantity),
      lineDiscount: roundMoney(item.lineDiscount || 0),
      taxableAmount: roundMoney(item.taxableAmount || 0),
      gstAmount: roundMoney(item.gstAmount || 0),
      lineTotal: roundMoney(item.lineTotal || 0),
    }));

    const subtotal = roundMoney(cart.subtotal || 0);
    const itemDiscountAmount = roundMoney(cart.itemDiscountAmount || 0);
    const cartDiscountAmount = roundMoney(cart.cartDiscountAmount || 0);
    const discountAmount = roundMoney(cart.discountAmount || itemDiscountAmount + cartDiscountAmount);
    const taxableSubtotal = roundMoney(cart.taxableSubtotal || 0);
    const gstAmount = roundMoney(cart.gstAmount || 0);
    const total = roundMoney(cart.total || 0);
    const amountPaid = roundMoney(payload.amountPaid ?? total);

    const order = {
      _id: randomUUID(),
      invoiceNumber,
      orderNumber: payload.orderNumber || invoiceNumber,
      cartId: cart._id,
      customerId: payload.customerId || cart.customerId || "",
      customerName: payload.customerName || cart.customerName || "",
      customerPhone: payload.customerPhone || cart.customerPhone || "",
      customerEmail: payload.customerEmail || cart.customerEmail || "",
      paymentMethod: payload.paymentMethod || "cash",
      status: payload.status || "completed",
      notes: payload.notes || cart.notes || "",
      items,
      subtotal,
      itemDiscountAmount,
      cartDiscountAmount,
      discountAmount,
      taxableSubtotal,
      gstAmount,
      gstRate: toNumber(payload.gstRate, cart.gstRate),
      total,
      amountPaid,
      changeDue: roundMoney(amountPaid - total),
      createdBy: payload.createdBy || cart.createdBy || null,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
      cancelledAt: null,
      refundedAt: null,
      cancelReason: "",
      refundReason: "",
      refundNumber: "",
    };

    await changeOrderStock({ ...order, items }, "out", "Order sale");
    await saveOrder(order);
    await Cart.close(cart._id);

    return order;
  },

  cancelOrder: async (orderId, payload = {}) => {
    const order = await findOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      throw new Error("Order is already closed");
    }

    await changeOrderStock(order, "in", "Order cancel");

    order.status = "cancelled";
    order.cancelReason = payload.reason || "";
    order.cancelledAt = new Date().toISOString();
    order.updatedAt = order.cancelledAt;
    await saveOrder(order);

    return order;
  },

  refundOrder: async (orderId, payload = {}) => {
    const order = await findOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      throw new Error("Order is already closed");
    }

    await changeOrderStock(order, "in", "Order refund");

    const refundedAt = new Date().toISOString();
    order.status = "refunded";
    order.refundReason = payload.reason || "";
    order.refundedAt = refundedAt;
    order.refundNumber = await generateRefundNumber();
    order.refundAmount = roundMoney(payload.refundAmount ?? order.total);
    order.updatedAt = refundedAt;
    await saveOrder(order);

    return order;
  },
};

export default Order;
