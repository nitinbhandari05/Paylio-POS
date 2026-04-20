import express from "express";
import Branch from "../models/branch.model.js";
import { requireHeadOffice } from "../middlewares/outlet.middleware.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const branches = await Branch.list();
  res.json({ branches });
});

router.get("/:id", async (req, res) => {
  const branch = await Branch.findOne({ _id: req.params.id });
  if (!branch) {
    return res.status(404).json({ message: "Branch not found" });
  }
  res.json({ branch });
});

router.post("/", requireHeadOffice, async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json({ message: "Branch created", branch });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id", requireHeadOffice, async (req, res) => {
  try {
    const branch = await Branch.update(req.params.id, req.body);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    res.json({ message: "Branch updated", branch });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
