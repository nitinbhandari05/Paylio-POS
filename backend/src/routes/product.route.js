import express from "express";
import Product from "../models/product.model.js";
import Inventory from "../models/inventory.model.js";

const router = express.Router();


// 🔹 Create Product
router.post("/", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ message: "Product created", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// 🔹 Get All Products
router.get("/", async (_req, res) => {
  try {
    const products = await Product.find();
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 🔹 Low Stock Products
router.get("/low-stock", async (_req, res) => {
  try {
    const products = await Product.find();

    const lowStockProducts = products.filter(
      (p) => p.stock <= (p.lowStockThreshold || 5)
    );

    res.json({ products: lowStockProducts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 🔹 Get Single Product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 🔹 Update Product
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product updated", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// 🔹 Delete Product
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 🔹 Update Stock (Inventory Movement)
router.post("/:id/stock", async (req, res) => {
  try {
    const { quantity, type, note } = req.body;

    // Validate
    if (!quantity || !type) {
      return res.status(400).json({ message: "Quantity and type required" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update stock
    if (type === "in") {
      product.stock += quantity;
    } else if (type === "out") {
      if (product.stock < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      product.stock -= quantity;
    }

    await product.save();

    // Save inventory log
    const movement = await Inventory.create({
      productId: product._id,
      quantity,
      type,
      note
    });

    res.status(201).json({
      message: "Stock updated",
      product,
      movement
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;