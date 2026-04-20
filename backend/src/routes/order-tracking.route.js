import express from "express";
import Order from "../models/order.model.js";

const router = express.Router();

router.get("/:invoiceNumber", async (req, res) => {
  const tracking = await Order.getTracking(req.params.invoiceNumber);
  if (!tracking) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json({ tracking });
});

export default router;
