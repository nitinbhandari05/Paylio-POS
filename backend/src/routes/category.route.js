import express from "express";
import Category from "../models/category.model.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const categories = await Category.list();
  res.json({ categories });
});

router.get("/:id", async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id });
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.json({ category });
});

router.post("/", async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ message: "Category created", category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const category = await Category.update(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category updated", category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const removed = await Category.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.json({ message: "Category deleted" });
});

export default router;
