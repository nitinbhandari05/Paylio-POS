import mongoose from "mongoose";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import { AppError } from "../utils/AppError.js";
import { emitLowStockAlert } from "../sockets/index.js";
import { cacheService } from "./cache.service.js";

const factors = { ADD: 1, RETURN: 1, REMOVE: -1, SALE: -1 };

export const inventoryService = {
  async adjust({ productId, quantity, operationType, reason, userId, session }) {
    const amount = Math.abs(Number(quantity || 0));
    if (!amount) throw new AppError("Quantity must be greater than zero", 400);
    const type = String(operationType).toUpperCase();
    if (!factors[type]) throw new AppError("Invalid inventory operation type", 400);

    const product = await Product.findById(productId).session(session);
    if (!product) throw new AppError("Product not found", 404);
    const previousStock = product.stock;
    const updatedStock = previousStock + factors[type] * amount;
    if (updatedStock < 0) throw new AppError("Insufficient stock", 400);
    product.stock = updatedStock;
    await product.save({ session });
    const [log] = await Inventory.create(
      [{ productId, previousStock, updatedStock, quantity: amount, operationType: type, reason, updatedBy: userId }],
      { session }
    );
    if (updatedStock <= product.lowStockThreshold) emitLowStockAlert({ productId, name: product.name, stock: updatedStock });
    await cacheService.del("products:*");
    await cacheService.del("dashboard:*");
    return log;
  },
  async withTransaction(callback) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await callback(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  },
  history(productId) {
    return Inventory.find({ productId }).populate("productId updatedBy").sort("-createdAt");
  },
};
