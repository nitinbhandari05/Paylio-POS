import express from "express";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Table from "../models/table.model.js";
import PromoCode from "../models/promo-code.model.js";
import Inventory from "../models/inventory.model.js";
import User from "../models/user.model.js";
import Branch from "../models/branch.model.js";
import Subscription from "../models/subscription.model.js";
import Billing from "../models/billing.model.js";
import { buildKotText, buildReceiptText, queuePrintJob } from "../utils/print.js";
import { emitRealtime } from "../utils/realtime.js";

const router = express.Router();
const DEFAULT_OUTLET_ID = process.env.DEFAULT_OUTLET_ID || "main";
const ONLINE_APP_PROVIDERS = ["swiggy", "zomato", "magicpin", "dunzo", "blinkit"];

const resolveOutlet = (req) =>
  String(req?.query?.outletId || req?.body?.outletId || DEFAULT_OUTLET_ID);

const normalizeProvider = (value) => String(value || "").trim().toLowerCase();

const resolveProductForAppItem = async (item = {}) => {
  if (item.productId) {
    return Product.findOne({ _id: String(item.productId) });
  }

  if (item.sku) {
    const bySku = await Product.findOne({ sku: String(item.sku) });
    if (bySku) return bySku;
  }

  if (item.name) {
    const byName = await Product.findOne({ name: String(item.name) });
    if (byName) return byName;
  }

  return null;
};

const buildOrderSummary = (orders = []) => {
  const billedOrders = orders.filter(
    (order) => !["cancelled", "refunded"].includes(String(order.status || "").toLowerCase())
  );
  const completedOrders = orders.filter((order) => order.status === "completed");
  const refundedOrders = orders.filter((order) => order.status === "refunded");
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");
  const totalSales = billedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalTax = billedOrders.reduce((sum, order) => sum + Number(order.gstAmount || 0), 0);
  const totalRefunds = refundedOrders.reduce(
    (sum, order) => sum + Number(order.refundAmount || order.total || 0),
    0
  );

  const paymentBreakdown = {};
  const orderTypeBreakdown = {};
  for (const order of orders) {
    const orderType = String(order.orderType || "dinein").toLowerCase();
    orderTypeBreakdown[orderType] = (orderTypeBreakdown[orderType] || 0) + 1;
    if (["cancelled", "refunded"].includes(String(order.status || "").toLowerCase())) continue;

    const payments = Array.isArray(order.payments) ? order.payments : [];
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const orderTotal = Number(order.total || 0);
    const cappedPaid = Math.max(0, Math.min(totalPaid, orderTotal));
    const scale = totalPaid > 0 ? cappedPaid / totalPaid : 0;

    for (const payment of payments) {
      const method = String(payment.method || "unknown").toLowerCase();
      const normalizedAmount = Number(payment.amount || 0) * scale;
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + normalizedAmount;
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
    avgOrderValue: billedOrders.length ? totalSales / billedOrders.length : 0,
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
      discountValue: Math.max(0, Number(req.body.discountAmount || 0)),
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

router.get("/integrations/apps/providers", async (_req, res) => {
  res.json({
    providers: ONLINE_APP_PROVIDERS,
    webhookPath: "/api/public/integrations/apps/orders",
    requiredFields: ["provider", "externalOrderId", "items"],
  });
});

router.get("/integrations/apps/orders", async (req, res) => {
  const outletId = resolveOutlet(req);
  const provider = normalizeProvider(req.query.provider || "");
  const statuses = String(req.query.status || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const orders = await Order.list({
    outletId,
    integrationSource: provider || undefined,
  });

  const integrationOrders = orders
    .filter((order) => Boolean(order.integrationSource))
    .filter((order) => (statuses.length ? statuses.includes(String(order.status || "").toLowerCase()) : true))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    outletId,
    provider: provider || "all",
    count: integrationOrders.length,
    orders: integrationOrders,
  });
});

router.post("/integrations/apps/orders", async (req, res) => {
  try {
    const expectedWebhookToken = String(process.env.ONLINE_APP_WEBHOOK_TOKEN || "").trim();
    if (expectedWebhookToken) {
      const receivedToken = String(req.headers["x-app-webhook-token"] || "").trim();
      if (!receivedToken || receivedToken !== expectedWebhookToken) {
        return res.status(401).json({ message: "Invalid webhook token" });
      }
    }

    const outletId = resolveOutlet(req);
    const provider = normalizeProvider(req.body.provider);
    const externalOrderId = String(req.body.externalOrderId || "").trim();
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];

    if (!provider || !ONLINE_APP_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "Valid provider is required" });
    }
    if (!externalOrderId) {
      return res.status(400).json({ message: "externalOrderId is required" });
    }
    if (!rawItems.length) {
      return res.status(400).json({ message: "items are required" });
    }

    const duplicate = await Order.findOne({
      externalOrderId,
      integrationSource: provider,
    });
    if (duplicate) {
      return res.status(409).json({
        message: "Order already imported",
        orderId: duplicate._id,
        invoiceNumber: duplicate.invoiceNumber,
      });
    }

    const mappedItems = [];
    const missingItems = [];

    for (const item of rawItems) {
      const product = await resolveProductForAppItem(item);
      if (!product) {
        missingItems.push({
          productId: item.productId || "",
          sku: item.sku || "",
          name: item.name || "",
        });
        continue;
      }

      mappedItems.push({
        productId: product._id,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice ?? item.price ?? product.price ?? 0),
      });
    }

    if (!mappedItems.length) {
      return res.status(400).json({
        message: "None of the incoming app items matched your menu products",
        missingItems,
      });
    }

    const cart = await Cart.create({
      outletId,
      customerName: req.body.customerName || req.body.customer?.name || "Online Customer",
      customerPhone: req.body.customerPhone || req.body.customer?.phone || "",
      customerEmail: req.body.customerEmail || req.body.customer?.email || "",
      notes: req.body.notes || "",
      orderSource: `app_${provider}`,
      createdBy: null,
    });

    for (const item of mappedItems) {
      await Cart.addItem(cart._id, item);
    }

    const paymentMethod = String(req.body.paymentMethod || "upi").toLowerCase();
    const importedOrder = await Order.createFromCart(cart._id, {
      outletId,
      orderType: "delivery",
      orderSource: `app_${provider}`,
      integrationSource: provider,
      externalOrderId,
      channelMetadata: {
        sourcePayloadRef: req.body.sourcePayloadRef || "",
        appStatus: req.body.appStatus || "placed",
      },
      customerName: req.body.customerName || req.body.customer?.name || "Online Customer",
      customerPhone: req.body.customerPhone || req.body.customer?.phone || "",
      customerEmail: req.body.customerEmail || req.body.customer?.email || "",
      deliveryAddress: req.body.deliveryAddress || req.body.customer?.address || "",
      notes: req.body.notes || "",
      payments: [{ method: paymentMethod, amount: 0 }],
      createdBy: null,
    });

    const acceptedOrder = await Order.updateStatus(importedOrder._id, "accepted", null);
    const kotJob = await queuePrintJob({
      type: "kot",
      orderId: acceptedOrder._id,
      content: buildKotText(acceptedOrder),
      copies: Number(req.body.kotCopies || 1),
    });

    emitRealtime("onlineOrder:new", acceptedOrder);
    emitRealtime("newOrder", acceptedOrder);
    emitRealtime("statusChanged", acceptedOrder);
    emitRealtime("print:queued", kotJob);

    res.status(201).json({
      message: "Online app order integrated",
      provider,
      outletId,
      order: acceptedOrder,
      mappedItems: mappedItems.length,
      missingItems,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
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
  const plans = await Subscription.listPlans();
  res.json({
    currency: "INR",
    billingCycle: "monthly",
    plans,
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

router.get("/inventory/daily-report", async (req, res) => {
  try {
    const outletId = resolveOutlet(req);
    const report = await Inventory.dailyReport(outletId, req.query.date);
    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

  const billedOrders = orders.filter(
    (item) => !["cancelled", "refunded"].includes(String(item.status || "").toLowerCase())
  );
  const topProductsMap = new Map();

  for (const order of billedOrders) {
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

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const todayBilled = billedOrders.filter((order) => {
    const createdAt = new Date(order.createdAt || "");
    if (Number.isNaN(createdAt.getTime())) return false;
    return createdAt >= startOfDay && createdAt <= endOfDay;
  });

  const todayRefunds = orders.filter((order) => {
    if (String(order.status || "").toLowerCase() !== "refunded") return false;
    const createdAt = new Date(order.createdAt || "");
    if (Number.isNaN(createdAt.getTime())) return false;
    return createdAt >= startOfDay && createdAt <= endOfDay;
  });

  const hourlyRevenue = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    orders: 0,
    revenue: 0,
  }));

  for (const order of todayBilled) {
    const createdAt = new Date(order.createdAt || "");
    const hour = createdAt.getHours();
    const bucket = hourlyRevenue[hour];
    bucket.orders += 1;
    bucket.revenue += Number(order.total || 0);
  }

  res.json({
    outletId,
    headline: {
      orders: orders.length,
      completedOrders: orders.filter((item) => item.status === "completed").length,
      grossRevenue: billedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      taxes: billedOrders.reduce((sum, order) => sum + Number(order.gstAmount || 0), 0),
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
    daily: {
      date: now.toISOString().slice(0, 10),
      orders: todayBilled.length,
      grossRevenue: todayBilled.reduce((sum, order) => sum + Number(order.total || 0), 0),
      taxes: todayBilled.reduce((sum, order) => sum + Number(order.gstAmount || 0), 0),
      refunds: todayRefunds.reduce(
        (sum, order) => sum + Number(order.refundAmount || order.total || 0),
        0
      ),
      avgOrderValue: todayBilled.length
        ? todayBilled.reduce((sum, order) => sum + Number(order.total || 0), 0) / todayBilled.length
        : 0,
      hourlyRevenue,
    },
  });
});

router.get("/reports/staff-activity", async (req, res) => {
  const outletId = resolveOutlet(req);
  const [orders, users] = await Promise.all([Order.list({ outletId }), User.list()]);

  const staffMap = new Map();
  for (const user of users) {
    if ((user.outletId || "main") !== outletId) continue;
    staffMap.set(String(user.name || "").toLowerCase(), {
      name: user.name || "Unknown",
      role: user.role || "staff",
      ordersHandled: 0,
      salesHandled: 0,
    });
  }

  for (const order of orders) {
    if (["cancelled", "refunded"].includes(String(order.status || "").toLowerCase())) continue;
    const key = String(order.waiterName || "").toLowerCase();
    if (!key) continue;
    const row = staffMap.get(key) || {
      name: order.waiterName,
      role: "staff",
      ordersHandled: 0,
      salesHandled: 0,
    };
    row.ordersHandled += 1;
    row.salesHandled += Number(order.total || 0);
    staffMap.set(key, row);
  }

  const staffActivity = [...staffMap.values()].sort((a, b) => b.salesHandled - a.salesHandled);
  res.json({ outletId, staffActivity });
});

router.get("/reports/outlet-comparison", async (_req, res) => {
  const [orders, outlets] = await Promise.all([Order.list(), Branch.list()]);
  const outletMap = new Map(outlets.map((row) => [row._id, row]));
  const metrics = new Map();

  for (const order of orders) {
    const outletId = order.outletId || "main";
    const row = metrics.get(outletId) || {
      outletId,
      outletName: outletMap.get(outletId)?.name || outletId,
      orders: 0,
      revenue: 0,
      completedOrders: 0,
      refunds: 0,
    };
    row.orders += 1;
    if (!["cancelled", "refunded"].includes(String(order.status || "").toLowerCase())) {
      row.revenue += Number(order.total || 0);
    }
    if (order.status === "completed") row.completedOrders += 1;
    if (order.status === "refunded") row.refunds += Number(order.refundAmount || order.total || 0);
    metrics.set(outletId, row);
  }

  const comparison = [...metrics.values()]
    .map((row) => ({ ...row, netRevenue: row.revenue - row.refunds }))
    .sort((a, b) => b.netRevenue - a.netRevenue);

  res.json({ outlets: comparison });
});

router.get("/crm/summary", async (req, res) => {
  const outletId = resolveOutlet(req);
  const orders = await Order.list({ outletId });
  const customerMap = new Map();

  for (const order of orders) {
    const key = String(order.customerPhone || order.customerEmail || order.customerName || "").trim().toLowerCase();
    if (!key) continue;
    const row = customerMap.get(key) || {
      key,
      name: order.customerName || "Guest",
      phone: order.customerPhone || "",
      email: order.customerEmail || "",
      visits: 0,
      totalSpend: 0,
      lastVisitAt: "",
      loyaltyPoints: 0,
    };
    row.visits += 1;
    row.totalSpend += Number(order.total || 0);
    row.lastVisitAt = row.lastVisitAt > order.createdAt ? row.lastVisitAt : order.createdAt;
    row.loyaltyPoints = Math.floor(row.totalSpend / 100);
    customerMap.set(key, row);
  }

  const customers = [...customerMap.values()].sort((a, b) => b.totalSpend - a.totalSpend);
  const repeatCustomers = customers.filter((row) => row.visits > 1);

  res.json({
    outletId,
    summary: {
      totalCustomers: customers.length,
      repeatCustomers: repeatCustomers.length,
      repeatRate: customers.length ? Number(((repeatCustomers.length / customers.length) * 100).toFixed(2)) : 0,
      loyaltyPointsIssued: customers.reduce((sum, row) => sum + row.loyaltyPoints, 0),
    },
    topCustomers: customers.slice(0, 20),
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

router.get("/integrations/status", async (_req, res) => {
  res.json({
    providers: [
      { id: "zomato", connected: true, lastSyncAt: new Date().toISOString() },
      { id: "swiggy", connected: true, lastSyncAt: new Date().toISOString() },
      { id: "magicpin", connected: false, lastSyncAt: null },
    ],
  });
});

router.post("/integrations/sync-orders", async (req, res) => {
  const provider = String(req.body.provider || "zomato").toLowerCase();
  const synced = Math.max(0, Number(req.body.limit || 12));
  res.json({
    provider,
    syncedOrders: synced,
    syncedAt: new Date().toISOString(),
    message: `Orders synced from ${provider}`,
  });
});

router.post("/payments/create-intent", async (req, res) => {
  const amount = Number(req.body.amount || 0);
  if (amount <= 0) {
    return res.status(400).json({ message: "amount must be greater than 0" });
  }
  const method = String(req.body.method || "upi").toLowerCase();
  res.status(201).json({
    intentId: `pi_${Date.now()}`,
    amount,
    method,
    status: "requires_confirmation",
    qrPayload: method === "upi" ? `upi://pay?pa=paylio@bank&am=${amount}` : "",
  });
});

router.post("/payments/verify", async (req, res) => {
  const intentId = String(req.body.intentId || "");
  if (!intentId) {
    return res.status(400).json({ message: "intentId is required" });
  }
  res.json({
    intentId,
    status: "succeeded",
    verifiedAt: new Date().toISOString(),
    reference: `txn_${Date.now()}`,
  });
});

router.post("/saas/billing/checkout", async (req, res) => {
  const amount = Number(req.body.amount || 0);
  if (amount <= 0) {
    return res.status(400).json({ message: "Valid amount is required" });
  }
  const invoice = await Billing.createInvoice({
    organizationId: req.body.organizationId || "org-main",
    planId: req.body.planId || "starter",
    planName: req.body.planName || "Starter",
    amount,
    paymentMethod: req.body.paymentMethod || "upi",
    status: "paid",
  });
  res.status(201).json({ message: "Subscription payment captured", invoice });
});

router.get("/saas/billing/invoices", async (req, res) => {
  const invoices = await Billing.listInvoices(req.query.organizationId || "org-main");
  res.json({ invoices });
});

router.get("/ai/analytics", async (req, res) => {
  const outletId = resolveOutlet(req);
  const [orders, stockSummary] = await Promise.all([
    Order.list({ outletId }),
    Inventory.summary(outletId),
  ]);
  const completed = orders.filter((row) => row.status === "completed");
  const orderHourMap = new Map();
  for (const row of completed) {
    const hour = new Date(row.createdAt).getHours();
    orderHourMap.set(hour, (orderHourMap.get(hour) || 0) + 1);
  }
  const peak = [...orderHourMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const lowStockTop = (stockSummary.lowStockItems || []).slice(0, 5);
  const avgOrderValue =
    completed.length > 0
      ? completed.reduce((sum, row) => sum + Number(row.total || 0), 0) / completed.length
      : 0;
  res.json({
    outletId,
    generatedAt: new Date().toISOString(),
    metrics: {
      totalOrders: orders.length,
      completedOrders: completed.length,
      avgOrderValue,
      lowStockCount: lowStockTop.length,
      predictedPeakHour: peak ? `${String(peak[0]).padStart(2, "0")}:00` : "19:00",
    },
    insights: [
      {
        id: "peak-hour",
        text: peak
          ? `Peak activity observed around ${String(peak[0]).padStart(2, "0")}:00. Keep extra cashier and kitchen runner.`
          : "Collect more data to predict peak hour accurately.",
      },
      {
        id: "low-stock",
        text: lowStockTop.length
          ? `${lowStockTop.length} items are low in stock. Prioritize replenishment today.`
          : "Inventory health looks stable for now.",
      },
      {
        id: "aov-optimization",
        text: `Current average order value is ${Math.round(avgOrderValue)} INR. Push combos to improve basket size.`,
      },
    ],
  });
});

export default router;
