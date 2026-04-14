import express from "express";
import Inventory from "../models/inventory.model.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const movements = await Inventory.list();
  res.json({ movements });
});

router.get("/summary", async (_req, res) => {
  const summary = await Inventory.summary();
  res.json({ summary });
});

router.post("/", async (req, res) => {
  try {
    const movement = await Inventory.createMovement(req.body);
    res.status(201).json({ message: "Movement recorded", movement });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
