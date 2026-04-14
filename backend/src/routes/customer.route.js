import express from "express";
import Customer from "../models/customer.model.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const customers = await Customer.list();
  res.json({ customers });
});

router.get("/:id", async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id });
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  res.json({ customer });
});

router.post("/", async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ message: "Customer created", customer });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const customer = await Customer.update(req.params.id, req.body);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer updated", customer });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const removed = await Customer.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: "Customer not found" });
  }

  res.json({ message: "Customer deleted" });
});

export default router;
