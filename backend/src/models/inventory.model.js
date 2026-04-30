import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";
import Product from "./product.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const movementsStore = createArrayStore(resolve(__dirname, "../../data/inventory.json"));
const stockStore = createArrayStore(resolve(__dirname, "../../data/outlet-stock.json"));

const DEFAULT_OUTLET_ID = process.env.DEFAULT_OUTLET_ID || "main";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOutlet = (outletId) => String(outletId || DEFAULT_OUTLET_ID);

const getStockRow = async (outletId, productId) => {
  const outlet = normalizeOutlet(outletId);
  const rows = await stockStore.read();
  return (
    rows.find(
      (row) => row.outletId === outlet && row.productId === String(productId)
    ) || null
  );
};

const saveStockRow = async (row) => {
  const rows = await stockStore.read();
  const index = rows.findIndex(
    (item) => item.outletId === row.outletId && item.productId === row.productId
  );

  if (index === -1) {
    rows.push(row);
  } else {
    rows[index] = row;
  }

  await stockStore.write(rows);
  return row;
};

const getOrCreateStockRow = async (outletId, productId) => {
  const outlet = normalizeOutlet(outletId);
  const product = await Product.findOne({ _id: productId });
  if (!product) {
    throw new Error("Product not found");
  }

  const existing = await getStockRow(outlet, productId);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const row = {
    _id: randomUUID(),
    outletId: outlet,
    productId: String(productId),
    productName: product.name,
    sku: product.sku,
    quantity: 0,
    lowStockThreshold: toNumber(product.lowStockThreshold, 5),
    updatedAt: now,
    createdAt: now,
  };

  await saveStockRow(row);
  return row;
};

const Inventory = {
  list: async (query = {}) => {
    const movements = await movementsStore.read();
    const outletFilter = query.outletId ? normalizeOutlet(query.outletId) : "";
    const productFilter = query.productId ? String(query.productId) : "";

    return movements.filter((movement) => {
      if (outletFilter && movement.outletId !== outletFilter) {
        return false;
      }
      if (productFilter && movement.productId !== productFilter) {
        return false;
      }
      return true;
    });
  },

  listStock: async (outletId) => {
    const rows = await stockStore.read();
    const outlet = normalizeOutlet(outletId);
    return rows.filter((row) => row.outletId === outlet);
  },

  getStock: async (outletId, productId) => getOrCreateStockRow(outletId, productId),

  createMovement: async (payload) => {
    const outletId = normalizeOutlet(payload.outletId);
    const stockRow = await getOrCreateStockRow(outletId, payload.productId);

    const quantity = Math.abs(toNumber(payload.quantity, 0));
    if (!quantity) {
      throw new Error("quantity must be greater than 0");
    }

    const type = String(payload.type || "adjust").toLowerCase();
    if (!["in", "out", "adjust"].includes(type)) {
      throw new Error("Invalid movement type");
    }

    const beforeStock = toNumber(stockRow.quantity, 0);
    let afterStock = beforeStock;

    if (type === "in") {
      afterStock = beforeStock + quantity;
    } else if (type === "out") {
      afterStock = beforeStock - quantity;
      if (afterStock < 0) {
        throw new Error("Insufficient stock");
      }
    } else {
      afterStock = toNumber(payload.balance, beforeStock);
      if (afterStock < 0) {
        throw new Error("Stock cannot be negative");
      }
    }

    stockRow.quantity = afterStock;
    stockRow.lowStockThreshold = toNumber(
      payload.lowStockThreshold,
      stockRow.lowStockThreshold
    );
    stockRow.updatedAt = new Date().toISOString();
    await saveStockRow(stockRow);

    const movements = await movementsStore.read();
    const now = new Date().toISOString();
    const movement = {
      _id: randomUUID(),
      outletId,
      productId: stockRow.productId,
      productName: stockRow.productName,
      sku: stockRow.sku,
      type,
      quantity,
      beforeStock,
      afterStock,
      note: payload.note || "",
      createdBy: payload.createdBy || null,
      createdAt: now,
      updatedAt: now,
    };

    movements.push(movement);
    await movementsStore.write(movements);
    return movement;
  },

  summary: async (outletId) => {
    const stockRows = await Inventory.listStock(outletId);
    const movements = await Inventory.list({ outletId });

    const lowStockItems = stockRows.filter(
      (row) => toNumber(row.quantity, 0) <= toNumber(row.lowStockThreshold, 5)
    );

    return {
      outletId: normalizeOutlet(outletId),
      productsCount: stockRows.length,
      movementsCount: movements.length,
      totalUnits: stockRows.reduce((sum, row) => sum + toNumber(row.quantity, 0), 0),
      lowStockItems,
    };
  },

  summaryByOutlet: async () => {
    const stockRows = await stockStore.read();
    const grouped = new Map();

    for (const row of stockRows) {
      const existing = grouped.get(row.outletId) || {
        outletId: row.outletId,
        productsCount: 0,
        totalUnits: 0,
      };
      existing.productsCount += 1;
      existing.totalUnits += toNumber(row.quantity, 0);
      grouped.set(row.outletId, existing);
    }

    return [...grouped.values()];
  },

  dailyReport: async (outletId, date = new Date().toISOString().slice(0, 10)) => {
    const outlet = normalizeOutlet(outletId);
    const day = String(date || "").slice(0, 10);
    const movements = (await Inventory.list({ outletId: outlet })).filter((movement) =>
      String(movement.createdAt || "").startsWith(day)
    );

    const productMap = new Map();
    for (const movement of movements) {
      const key = movement.productId;
      const current = productMap.get(key) || {
        productId: movement.productId,
        productName: movement.productName,
        sku: movement.sku,
        stockIn: 0,
        stockOut: 0,
      };
      if (movement.type === "in") current.stockIn += Number(movement.quantity || 0);
      if (movement.type === "out") current.stockOut += Number(movement.quantity || 0);
      productMap.set(key, current);
    }

    return {
      outletId: outlet,
      date: day,
      items: [...productMap.values()].map((row) => ({
        ...row,
        net: row.stockIn - row.stockOut,
      })),
      totals: {
        stockIn: movements
          .filter((row) => row.type === "in")
          .reduce((sum, row) => sum + Number(row.quantity || 0), 0),
        stockOut: movements
          .filter((row) => row.type === "out")
          .reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      },
    };
  },
};

export default Inventory;
