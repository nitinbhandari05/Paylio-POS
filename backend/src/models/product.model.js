import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";
import Category from "./category.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/products.json"));

const DEFAULT_GST_RATE = Number(process.env.GST_RATE || 5);

const normalizeText = (value) => (value || "").trim().toLowerCase();
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const skuFromName = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const Product = {
  list: async () => store.read(),

  findOne: async (query = {}) => {
    const products = await store.read();

    if (query._id) {
      return products.find((item) => item._id === String(query._id)) || null;
    }

    if (query.sku) {
      const sku = normalizeText(query.sku);
      return products.find((item) => normalizeText(item.sku) === sku) || null;
    }

    if (query.name) {
      const name = normalizeText(query.name);
      return products.find((item) => normalizeText(item.name) === name) || null;
    }

    return products.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const products = await store.read();
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new Error("Product name is required");
    }

    const sku = String(payload.sku || skuFromName(name)).trim();
    if (!sku) {
      throw new Error("Product SKU is required");
    }

    const duplicateSku = products.find((item) => normalizeText(item.sku) === normalizeText(sku));
    if (duplicateSku) {
      throw new Error("Product SKU already exists");
    }

    let categoryId = payload.categoryId || "";
    let categoryName = payload.categoryName || "";
    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId });
      if (!category) {
        throw new Error("Category not found");
      }
      categoryName = category.name;
    }

    const now = new Date().toISOString();
    const product = {
      _id: randomUUID(),
      name,
      sku,
      categoryId,
      categoryName,
      description: payload.description || "",
      price: toNumber(payload.price, 0),
      cost: toNumber(payload.cost ?? payload.costPrice, 0),
      taxRate: toNumber(payload.taxRate ?? payload.gstRate ?? payload.taxPercentage, DEFAULT_GST_RATE),
      stock: toNumber(payload.stock, 0),
      unit: payload.unit || "pcs",
      lowStockThreshold: toNumber(payload.lowStockThreshold, 5),
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      images: Array.isArray(payload.images) ? payload.images : [],
      createdAt: now,
      updatedAt: now,
    };

    products.push(product);
    await store.write(products);
    return product;
  },

  update: async (id, payload = {}) => {
    const products = await store.read();
    const index = products.findIndex((item) => item._id === String(id));
    if (index === -1) {
      return null;
    }

    if (payload.name !== undefined) {
      const nextName = String(payload.name).trim();
      if (!nextName) {
        throw new Error("Product name is required");
      }
      products[index].name = nextName;
    }

    if (payload.sku !== undefined) {
      const nextSku = String(payload.sku).trim();
      if (!nextSku) {
        throw new Error("Product SKU is required");
      }
      const duplicate = products.find(
        (item, currentIndex) =>
          currentIndex !== index && normalizeText(item.sku) === normalizeText(nextSku)
      );
      if (duplicate) {
        throw new Error("Product SKU already exists");
      }
      products[index].sku = nextSku;
    }

    if (payload.categoryId !== undefined) {
      if (payload.categoryId) {
        const category = await Category.findOne({ _id: payload.categoryId });
        if (!category) {
          throw new Error("Category not found");
        }
        products[index].categoryId = payload.categoryId;
        products[index].categoryName = category.name;
      } else {
        products[index].categoryId = "";
        products[index].categoryName = "";
      }
    }

    if (payload.description !== undefined) {
      products[index].description = payload.description;
    }
    if (payload.price !== undefined) {
      products[index].price = toNumber(payload.price, products[index].price);
    }
    if (payload.cost !== undefined || payload.costPrice !== undefined) {
      products[index].cost = toNumber(payload.cost ?? payload.costPrice, products[index].cost);
    }
    if (payload.taxRate !== undefined || payload.gstRate !== undefined || payload.taxPercentage !== undefined) {
      products[index].taxRate = toNumber(
        payload.taxRate ?? payload.gstRate ?? payload.taxPercentage,
        products[index].taxRate
      );
    }
    if (payload.stock !== undefined) {
      products[index].stock = toNumber(payload.stock, products[index].stock);
    }
    if (payload.unit !== undefined) {
      products[index].unit = payload.unit || "pcs";
    }
    if (payload.lowStockThreshold !== undefined) {
      products[index].lowStockThreshold = toNumber(
        payload.lowStockThreshold,
        products[index].lowStockThreshold
      );
    }
    if (payload.active !== undefined) {
      products[index].active = Boolean(payload.active);
    }
    if (payload.images !== undefined) {
      const images = Array.isArray(products[index].images) ? products[index].images : [];
      products[index].images = images.concat(Array.isArray(payload.images) ? payload.images : []);
    }

    products[index].updatedAt = new Date().toISOString();
    await store.write(products);
    return products[index];
  },

  remove: async (id) => {
    const products = await store.read();
    const filtered = products.filter((item) => item._id !== String(id));
    if (filtered.length === products.length) {
      return false;
    }
    await store.write(filtered);
    return true;
  },
};

export default Product;
