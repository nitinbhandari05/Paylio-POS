import express from "express";
import DeliveryAgent from "../models/delivery-agent.model.js";
import Order from "../models/order.model.js";
import { emitRealtime } from "../utils/realtime.js";
import { requireRoles, resolveOutletContext } from "../middlewares/outlet.middleware.js";

const router = express.Router();

router.use(resolveOutletContext);
router.use(requireRoles("manager", "admin", "superadmin", "headoffice", "cashier", "delivery"));

router.get("/agents", async (req, res) => {
  const agents = await DeliveryAgent.list({ outletId: req.outletId });
  res.json({ outletId: req.outletId, agents });
});

router.post("/agents", async (req, res) => {
  try {
    const agent = await DeliveryAgent.create({
      ...req.body,
      outletId: req.outletId,
    });
    res.status(201).json({ message: "Delivery agent created", agent });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/agents/:id", async (req, res) => {
  try {
    const agent = await DeliveryAgent.update(req.params.id, req.body);
    if (!agent) {
      return res.status(404).json({ message: "Delivery agent not found" });
    }
    res.json({ message: "Delivery agent updated", agent });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/orders/:id/assign", async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ _id: req.body.agentId });
    if (!agent) {
      return res.status(404).json({ message: "Delivery agent not found" });
    }

    const order = await Order.assignDelivery(req.params.id, {
      agentId: agent._id,
      agentName: agent.name,
    });

    emitRealtime("delivery:assigned", order);
    emitRealtime("statusChanged", order);
    res.json({ message: "Delivery agent assigned", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const order = await Order.updateDeliveryStatus(
      req.params.id,
      req.body.status,
      req.user?.id || null
    );
    emitRealtime("delivery:statusChanged", order);
    emitRealtime("statusChanged", order);
    res.json({ message: "Delivery status updated", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
