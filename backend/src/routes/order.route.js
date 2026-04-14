import express from "express";
import Order from "../models/order.model.js";

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

router.get("/:id", async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json({ order });
});

router.post("/from-cart/:cartId", async (req, res) => {
  try {
    const order = await Order.createFromCart(req.params.cartId, {
      ...req.body,
      createdBy: req.user?.id || null,
    });

    res.status(201).json({ message: "Order created", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/cancel", async (req, res) => {
  try {
    const order = await Order.cancelOrder(req.params.id, req.body);
    res.json({ message: "Order cancelled", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/refund", async (req, res) => {
  try {
    const order = await Order.refundOrder(req.params.id, req.body);
    res.json({ message: "Order refunded", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
