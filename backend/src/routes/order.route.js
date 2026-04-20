import express from "express";
import Order from "../models/order.model.js";
import { buildKotText, buildReceiptText, queuePrintJob } from "../utils/print.js";
import { emitRealtime } from "../utils/realtime.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const orders = await Order.list();
  res.json({ orders });
});

router.get("/summary", async (_req, res) => {
  const orders = await Order.list();
  const completedOrders = orders.filter((order) => order.status === "completed");
  const refundedOrders = orders.filter((order) => order.status === "refunded");
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");
  const totalSales = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalTax = completedOrders.reduce((sum, order) => sum + Number(order.gstAmount || 0), 0);
  const totalRefunds = refundedOrders.reduce(
    (sum, order) => sum + Number(order.refundAmount || order.total || 0),
    0
  );

  res.json({
    summary: {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      refundedOrders: refundedOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalSales,
      totalTax,
      totalRefunds,
      netSales: totalSales - totalRefunds,
    },
  });
});

router.get("/kitchen/board", async (req, res) => {
  const statusFilter = String(req.query.status || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const statuses = statusFilter.length
    ? statusFilter
    : ["pending", "accepted", "preparing", "ready"];

  const orders = await Order.listKitchenOrders(statuses);
  res.json({ statuses, orders });
});

router.post("/from-cart/:cartId", async (req, res) => {
  try {
    const order = await Order.createFromCart(req.params.cartId, {
      ...req.body,
      createdBy: req.user?.id || null,
    });

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
      items: order.items,
      createdAt: order.createdAt,
      tableNo: order.tableNo || "",
      waiterName: order.waiterName || "",
    });
    emitRealtime("print:queued", kotJob);

    res.status(201).json({ message: "Order created", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const order = await Order.updateStatus(req.params.id, req.body.status, req.user?.id || null);
    emitRealtime("statusChanged", order);
    res.json({ message: "Order status updated", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/cancel", async (req, res) => {
  try {
    const order = await Order.cancelOrder(req.params.id, {
      ...req.body,
      by: req.user?.id || null,
    });
    emitRealtime("statusChanged", order);
    emitRealtime("order:cancelled", order);
    res.json({ message: "Order cancelled", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/refund", async (req, res) => {
  try {
    const order = await Order.refundOrder(req.params.id, {
      ...req.body,
      by: req.user?.id || null,
    });
    emitRealtime("statusChanged", order);
    emitRealtime("order:refunded", order);
    res.json({ message: "Order refunded", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/:id/receipt", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json({
    orderId: order._id,
    invoiceNumber: order.invoiceNumber,
    receiptText: buildReceiptText(order),
    order,
  });
});

router.post("/:id/print/receipt", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id });
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

router.post("/:id/print/kot", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id });
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

router.get("/:id", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json({ order });
});

export default router;
