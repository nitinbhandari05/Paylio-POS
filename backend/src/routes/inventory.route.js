import express from "express";
import Inventory from "../models/inventory.model.js";

const router = express.Router();

const resolveOutletId = (req) =>
  req.headers["x-outlet-id"] || req.query.outletId || req.body.outletId || req.user?.outletId || "main";

router.post("/", async (req, res) => {
  try {
    const movement = await Inventory.createMovement({
      ...req.body,
      outletId: resolveOutletId(req),
      createdBy: req.user?.id || null,
    });
    res.status(201).json({ message: "Movement recorded", movement });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const movements = await Inventory.list({
      outletId: resolveOutletId(req),
      productId: req.query.productId,
    });
    res.json({ movements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/stock", async (req, res) => {
  try {
    const outletId = resolveOutletId(req);
    const stock = await Inventory.listStock(outletId);
    res.json({ outletId, stock });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const summary = await Inventory.summary(resolveOutletId(req));
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
