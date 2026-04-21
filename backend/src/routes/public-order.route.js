import express from "express";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Table from "../models/table.model.js";
import PromoCode from "../models/promo-code.model.js";
import { buildKotText, queuePrintJob } from "../utils/print.js";
import { emitRealtime } from "../utils/realtime.js";

const router = express.Router();
const DEFAULT_OUTLET_ID = process.env.DEFAULT_OUTLET_ID || "main";

const resolveOutlet = (req) =>
  String(req?.query?.outletId || req?.body?.outletId || DEFAULT_OUTLET_ID);

const buildOrderSummary = (orders = []) => {
  const completedOrders = orders.filter((order) => order.status === "completed");
  const refundedOrders = orders.filter((order) => order.status === "refunded");
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");
  const totalSales = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalTax = completedOrders.reduce((sum, order) => sum + Number(order.gstAmount || 0), 0);
  const totalRefunds = refundedOrders.reduce(
    (sum, order) => sum + Number(order.refundAmount || order.total || 0),
    0
  );

  const paymentBreakdown = {};
  const orderTypeBreakdown = {};
  for (const order of orders) {
    const orderType = String(order.orderType || "dinein").toLowerCase();
    orderTypeBreakdown[orderType] = (orderTypeBreakdown[orderType] || 0) + 1;
    for (const payment of order.payments || []) {
      const method = String(payment.method || "unknown").toLowerCase();
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(payment.amount || 0);
    }
  }

  return {
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    refundedOrders: refundedOrders.length,
    cancelledOrders: cancelledOrders.length,
    totalSales,
    totalTax,
    totalRefunds,
    netSales: totalSales - totalRefunds,
    avgOrderValue: orders.length ? totalSales / orders.length : 0,
    paymentBreakdown,
    orderTypeBreakdown,
  };
};

const applyPromoOnCart = async (cartId, code) => {
  if (!code) {
    return { promoCode: "", discountAmount: 0 };
  }

  const cart = await Cart.findOne({ _id: cartId });
  if (!cart) {
    throw new Error("Cart not found");
  }

  const { promo, discountAmount } = await PromoCode.validate(code, cart.total || 0);
  await Cart.updateDiscount(cartId, {
    discountType: "flat",
    discountValue: discountAmount,
  });
  await PromoCode.consume(promo._id);
  return { promoCode: promo.code, discountAmount };
};

router.get("/menu", async (_req, res) => {
  const products = await Product.list();
  const menu = products.filter((product) => product.active !== false);
  res.json({ menu });
});

router.get("/table/:tableNumber/menu", async (req, res) => {
  const outletId = resolveOutlet(req);
  const table = await Table.findOne({
    number: Number(req.params.tableNumber),
    outletId,
  });
  if (!table || !table.active) {
    return res.status(404).json({ message: "Table not found" });
  }

  const products = await Product.list();
  const menu = products.filter((product) => product.active !== false);
  res.json({
    outletId,
    table: {
      id: table._id,
      number: table.number,
      seats: table.seats,
      status: table.status,
    },
    menu,
  });
});

router.post("/orders", async (req, res) => {
  try {
    const outletId = resolveOutlet(req);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(400).json({ message: "items are required" });
    }

    const orderType = String(req.body.orderType || "pickup").toLowerCase();
    let table = null;
    if (orderType === "qr_table") {
      table = await Table.findOne({
        number: Number(req.body.tableNo || req.body.tableNumber),
        outletId,
      });
      if (!table) {
        return res.status(400).json({ message: "Valid table number is required for qr_table" });
      }
    }

    const cart = await Cart.create({
      outletId,
      customerName: req.body.customerName || "",
      customerPhone: req.body.customerPhone || "",
      customerEmail: req.body.customerEmail || "",
      notes: req.body.notes || "",
      discountType: "flat",
      discountValue: 0,
      orderSource: req.body.orderSource || "online",
      createdBy: null,
    });

    for (const item of items) {
      await Cart.addItem(cart._id, item);
    }

    const promoResult = await applyPromoOnCart(cart._id, req.body.promoCode);

    const order = await Order.createFromCart(cart._id, {
      outletId,
      orderType,
      orderSource: req.body.orderSource || "online",
      customerName: req.body.customerName || "",
      customerPhone: req.body.customerPhone || "",
      customerEmail: req.body.customerEmail || "",
      deliveryAddress: req.body.deliveryAddress || "",
      tableNo: table ? String(table.number) : req.body.tableNo || "",
      waiterName: req.body.waiterName || "",
      notes: req.body.notes || "",
      payments: req.body.payments || [{ method: req.body.paymentMethod || "cash", amount: 0 }],
      createdBy: null,
    });

    if (table) {
      await Table.update(table._id, { status: "occupied" });
    }

    const kotJob = await queuePrintJob({
      type: "kot",
      orderId: order._id,
      content: buildKotText(order),
      copies: Number(req.body.kotCopies || 1),
    });

    emitRealtime("newOrder", order);
    emitRealtime("kitchen:newKOT", {
      orderId: order._id,
      invoiceNumber: order.invoiceNumber,
      kotNumber: order.kotNumber,
      status: order.status,
      orderType: order.orderType,
      items: order.items,
      createdAt: order.createdAt,
      tableNo: order.tableNo || "",
      waiterName: order.waiterName || "",
    });
    emitRealtime("print:queued", kotJob);

    res.status(201).json({
      message: "Order created",
      order,
      promo: promoResult,
      trackingUrl: `/api/order-tracking/${order.invoiceNumber}`,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/orders", async (req, res) => {
  const outletId = resolveOutlet(req);
  const status = String(req.query.status || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));

  const allOrders = await Order.list({ outletId });
  const filtered = status.length
    ? allOrders.filter((order) => status.includes(String(order.status || "").toLowerCase()))
    : allOrders;

  const orders = filtered
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  res.json({ outletId, count: orders.length, orders });
});

router.get("/orders/summary", async (req, res) => {
  const outletId = resolveOutlet(req);
  const orders = await Order.list({ outletId });
  res.json({ outletId, summary: buildOrderSummary(orders) });
});

router.get("/kitchen/board", async (req, res) => {
  const outletId = resolveOutlet(req);
  const statusFilter = String(req.query.status || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const statuses = statusFilter.length
    ? statusFilter
    : ["pending", "accepted", "preparing", "ready"];
  const orders = await Order.listKitchenOrders(statuses, outletId);
  res.json({ outletId, statuses, orders });
});

router.patch("/orders/:orderId/status", async (req, res) => {
  try {
    const order = await Order.updateStatus(req.params.orderId, req.body.status, null);
    emitRealtime("statusChanged", order);
    res.json({ message: "Order status updated", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/orders/:orderId/print/kot", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const job = await queuePrintJob({
    type: "kot",
    orderId: order._id,
    content: buildKotText(order),
    copies: Number(req.body.copies || 1),
  });

  emitRealtime("print:queued", job);
  res.status(201).json({ message: "KOT print queued", job });
});

router.get("/orders/:invoiceNumber", async (req, res) => {
  const tracking = await Order.getTracking(req.params.invoiceNumber);
  if (!tracking) {
    return res.status(404).json({ message: "Order not found" });
  }
  res.json({ tracking });
});

router.post("/promos/validate", async (req, res) => {
  try {
    const result = await PromoCode.validate(req.body.code, Number(req.body.totalAmount || 0));
    res.json({
      code: result.promo.code,
      title: result.promo.title,
      discountAmount: result.discountAmount,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
