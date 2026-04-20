import express from "express";
import Product from "../models/product.model.js";
import Inventory from "../models/inventory.model.js";

const router = express.Router();

const resolveOutletId = (req) =>
  req.headers["x-outlet-id"] || req.query.outletId || req.body.outletId || req.user?.outletId || "main";

router.post("/", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ message: "Product created", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const products = await Product.list();
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/low-stock", async (req, res) => {
  try {
    const outletId = resolveOutletId(req);
    const stock = await Inventory.listStock(outletId);
    const products = await Product.list();
    const productMap = new Map(products.map((product) => [product._id, product]));

    const lowStockProducts = stock
      .filter((row) => Number(row.quantity) <= Number(row.lowStockThreshold || 5))
      .map((row) => ({
        ...productMap.get(row.productId),
        outletId: row.outletId,
        outletStock: row.quantity,
      }));

    res.json({ outletId, products: lowStockProducts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const outletId = resolveOutletId(req);
    const stock = await Inventory.getStock(outletId, product._id);
    res.json({ product: { ...product, outletId, outletStock: stock.quantity } });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  try {
    const removed = await Product.remove(req.params.id);
    if (!removed) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/stock", async (req, res) => {
  try {
    const movement = await Inventory.createMovement({
      outletId: resolveOutletId(req),
      productId: req.params.id,
      quantity: req.body.quantity,
      type: req.body.type,
      note: req.body.note,
      lowStockThreshold: req.body.lowStockThreshold,
      createdBy: req.user?.id || null,
    });

    res.status(201).json({ message: "Stock updated", movement });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
