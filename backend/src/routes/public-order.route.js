import express from "express";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Table from "../models/table.model.js";
import PromoCode from "../models/promo-code.model.js";
import Inventory from "../models/inventory.model.js";
import User from "../models/user.model.js";
import Branch from "../models/branch.model.js";
import { buildKotText, buildReceiptText, queuePrintJob } from "../utils/print.js";
import { emitRealtime } from "../utils/realtime.js";

const router = express.Router();
const DEFAULT_OUTLET_ID = process.env.DEFAULT_OUTLET_ID || "main";

const resolveOutlet = (req) =>
  String(req?.query?.outletId || req?.body?.outletId || DEFAULT_OUTLET_ID);

const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthlyINR: 1499,
    outletsIncluded: 1,
    features: ["POS Billing", "Basic Reports", "Inventory Tracking"],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyINR: 3999,
    outletsIncluded: 3,
    features: ["Everything in Starter", "Kitchen + Waiter Workflow", "Advanced Reports"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyINR: 9999,
    outletsIncluded: 999,
    features: ["Multi Outlet", "Role Policies", "Priority Support", "Custom Integrations"],
  },
];

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

    // Auto-accept POS orders immediately when bill is saved/printed
    const acceptedOrder = await Order.updateStatus(order._id, "accepted", null);

    const receiptJob = await queuePrintJob({
      type: "receipt",
      orderId: acceptedOrder._id,
      content: buildReceiptText(acceptedOrder),
      copies: Number(req.body.receiptCopies || 1),
    });

    emitRealtime("newOrder", acceptedOrder);
    emitRealtime("statusChanged", acceptedOrder);
    emitRealtime("print:queued", receiptJob);

    res.status(201).json({
      message: "Order created",
      order: acceptedOrder,
      promo: promoResult,
      trackingUrl: `/api/order-tracking/${acceptedOrder.invoiceNumber}`,
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

router.post("/orders/:orderId/cancel", async (req, res) => {
  try {
    const order = await Order.cancelOrder(req.params.orderId, {
      reason: req.body.reason || "",
      by: null,
    });
    emitRealtime("statusChanged", order);
    res.json({ message: "Order cancelled", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/orders/:orderId/refund", async (req, res) => {
  try {
    const order = await Order.refundOrder(req.params.orderId, {
      reason: req.body.reason || "",
      refundAmount: req.body.refundAmount,
      by: null,
    });
    emitRealtime("statusChanged", order);
    res.json({ message: "Order refunded", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/orders/:orderId/receipt", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  res.json({
    orderId: order._id,
    invoiceNumber: order.invoiceNumber,
    receiptText: buildReceiptText(order),
    template: "default-thermal-v1",
    order,
  });
});

router.post("/orders/:orderId/print/receipt", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  const job = await queuePrintJob({
    type: "receipt",
    orderId: order._id,
    content: buildReceiptText(order),
    copies: Number(req.body.copies || 1),
  });
  emitRealtime("print:queued", job);
  res.status(201).json({ message: "Receipt print queued", job });
});

router.get("/tables", async (req, res) => {
  const outletId = resolveOutlet(req);
  const tables = await Table.list({ outletId });
  res.json({ outletId, tables });
});

router.patch("/tables/:tableId/status", async (req, res) => {
  try {
    const table = await Table.update(req.params.tableId, { status: req.body.status });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    res.json({ message: "Table status updated", table });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/inventory/summary", async (req, res) => {
  const outletId = resolveOutlet(req);
  const summary = await Inventory.summary(outletId);
  res.json({ summary });
});

router.get("/outlets", async (_req, res) => {
  const outlets = await Branch.list();
  res.json({ outlets });
});

router.get("/subscription/plans", async (_req, res) => {
  res.json({
    currency: "INR",
    billingCycle: "monthly",
    plans: SUBSCRIPTION_PLANS,
  });
});

router.get("/inventory/stock", async (req, res) => {
  const outletId = resolveOutlet(req);
  const stock = await Inventory.listStock(outletId);
  res.json({ outletId, stock });
});

router.post("/inventory/movement", async (req, res) => {
  try {
    const movement = await Inventory.createMovement({
      ...req.body,
      outletId: resolveOutlet(req),
      createdBy: null,
    });
    res.status(201).json({ message: "Movement recorded", movement });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/reports/overview", async (req, res) => {
  const outletId = resolveOutlet(req);
  const [orders, inventorySummary, stockRows, staff] = await Promise.all([
    Order.list({ outletId }),
    Inventory.summary(outletId),
    Inventory.listStock(outletId),
    User.list(),
  ]);

  const completedOrders = orders.filter((item) => item.status === "completed");
  const topProductsMap = new Map();

  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.productId || item.name;
      const current = topProductsMap.get(key) || {
        productId: item.productId || "",
        name: item.name || "Unknown",
        quantity: 0,
        revenue: 0,
      };
      current.quantity += Number(item.quantity || 0);
      current.revenue += Number(item.lineTotal || item.quantity * item.unitPrice || 0);
      topProductsMap.set(key, current);
    }
  }

  const topProducts = [...topProductsMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const staffCount = staff.filter((user) => (user.outletId || "main") === outletId).length;
  const recentTrend = orders
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-14)
    .map((order) => ({
      date: order.createdAt,
      total: Number(order.total || 0),
      status: order.status,
    }));

  res.json({
    outletId,
    headline: {
      orders: orders.length,
      completedOrders: completedOrders.length,
      grossRevenue: completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      taxes: completedOrders.reduce((sum, order) => sum + Number(order.gstAmount || 0), 0),
      refunds: orders
        .filter((order) => order.status === "refunded")
        .reduce((sum, order) => sum + Number(order.refundAmount || order.total || 0), 0),
      staffCount,
      lowStockItems: inventorySummary.lowStockItems?.length || 0,
      skuCount: stockRows.length,
      inventoryUnits: inventorySummary.totalUnits || 0,
    },
    topProducts,
    recentTrend,
  });
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
