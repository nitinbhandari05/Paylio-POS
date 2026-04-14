import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";
import Product from "./product.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/inventory.json"));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const Inventory = {
  list: async () => store.read(),

  createMovement: async (payload) => {
    const product = await Product.findOne({ _id: payload.productId });
    if (!product) {
      throw new Error("Product not found");
    }

    const quantity = Math.abs(toNumber(payload.quantity, 0));
    if (!quantity) {
      throw new Error("quantity must be greater than 0");
    }

    const type = (payload.type || "adjust").toLowerCase();
    if (!["in", "out", "adjust"].includes(type)) {
      throw new Error("Invalid movement type");
    }

    const beforeStock = toNumber(product.stock, 0);
    let afterStock = beforeStock;

    if (type === "in") {
      afterStock = beforeStock + quantity;
    } else if (type === "out") {
      afterStock = beforeStock - quantity;
      if (afterStock < 0) {
        throw new Error("Insufficient stock");
      }
    } else {
      afterStock = toNumber(payload.balance, beforeStock + quantity);
    }

    await Product.update(product._id, { stock: afterStock });

    const movements = await store.read();
    const now = new Date().toISOString();
    const movement = {
      _id: randomUUID(),
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      type,
      quantity,
      note: payload.note || "",
      beforeStock,
      afterStock,
      createdAt: now,
      updatedAt: now,
    };

    movements.push(movement);
    await store.write(movements);

    return movement;
  },

  summary: async () => {
    const products = await Product.list();
    const movements = await store.read();

    const totalStockValue = products.reduce(
      (sum, product) => sum + toNumber(product.stock, 0) * toNumber(product.cost, 0),
      0
    );

    const lowStockItems = products.filter(
      (product) => toNumber(product.stock, 0) <= toNumber(product.lowStockThreshold, 5)
    );

    return {
      productsCount: products.length,
      movementsCount: movements.length,
      totalUnits: products.reduce((sum, product) => sum + toNumber(product.stock, 0), 0),
      totalStockValue,
      lowStockItems,
    };
  },
};

export default Inventory;
