import Inventory from "../models/inventory.model.js";
import Product from "../models/product.model.js";

export const createMovement = async (req, res) => {
  try {
    const { productId, quantity, type, note } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    let beforeStock = product.stock;
    let afterStock = beforeStock;

    if (type === "in") {
      afterStock += quantity;
    } else if (type === "out") {
      if (beforeStock < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      afterStock -= quantity;
    } else if (type === "adjust") {
      afterStock = quantity;
    }

    // ✅ Update product stock
    product.stock = afterStock;
    await product.save();

    // ✅ Save movement
    const movement = await Inventory.create({
      productId,
      type,
      quantity,
      beforeStock,
      afterStock,
      note
    });

    res.status(201).json({ message: "Stock updated", movement });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 🔹 Get All Movements
export const getMovements = async (req, res) => {
  try {
    const movements = await Inventory.find().populate("productId");
    res.json({ movements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 🔹 Inventory Summary
export const getSummary = async (req, res) => {
  try {
    const products = await Product.find();
    const movements = await Inventory.find();

    const totalStockValue = products.reduce(
      (sum, p) => sum + p.stock * p.cost,
      0
    );

    const lowStockItems = products.filter(
      (p) => p.stock <= (p.lowStockThreshold || 5)
    );

    res.json({
      productsCount: products.length,
      movementsCount: movements.length,
      totalUnits: products.reduce((sum, p) => sum + p.stock, 0),
      totalStockValue,
      lowStockItems
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};