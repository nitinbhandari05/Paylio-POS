import express from "express";
import Product from "../models/product.model.js";
import Inventory from "../models/inventory.model.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const products = await Product.list();
  res.json({ products });
});

router.get("/low-stock", async (_req, res) => {
  const products = await Product.list();
  const lowStockProducts = products.filter(
    (product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)
  );

  res.json({ products: lowStockProducts });
});

router.get("/:id", async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ product });
});

router.post("/", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ message: "Product created", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const product = await Product.update(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product updated", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const removed = await Product.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ message: "Product deleted" });
});

router.post("/:id/stock", async (req, res) => {
  try {
    const movement = await Inventory.createMovement({
      ...req.body,
      productId: req.params.id,
    });

    const product = await Product.findOne({ _id: req.params.id });
    res.status(201).json({ message: "Stock updated", movement, product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
