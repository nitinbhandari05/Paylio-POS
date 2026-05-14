import crypto from "node:crypto";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import { cacheService } from "./cache.service.js";
import { fileService } from "./file.service.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { AppError } from "../utils/AppError.js";

const makeBarcode = () => crypto.randomInt(100000000000, 999999999999).toString();
const normalizeSort = (sort = "-createdAt") => String(sort).replace(/,/g, " ");
const makeSku = (name) =>
  `${String(name || "ITEM")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "ITEM"}-${crypto.randomInt(1000, 9999)}`;

const resolveCategoryId = async (categoryId) => {
  if (categoryId) return categoryId;
  const category =
    (await Category.findOne({ name: "Uncategorized" })) ||
    (await Category.create({
      name: "Uncategorized",
      description: "Default category for synced POS items",
    }));
  return category._id;
};

export const productService = {
  async create(payload, files = [], userId) {
    const images = [];
    for (const file of files) images.push(await fileService.uploadImage(file));
    const categoryId = await resolveCategoryId(payload.categoryId);
    const product = await Product.create({
      ...payload,
      categoryId,
      sku: String(payload.sku || makeSku(payload.name)).toUpperCase(),
      barcode: payload.barcode || makeBarcode(),
      images: images.filter(Boolean),
      createdBy: userId,
    });
    await cacheService.del("products:*");
    return product;
  },
  async list(query) {
    const { page, limit, skip } = getPagination(query);
    const key = cacheService.key("products", query);
    const cached = await cacheService.get(key);
    if (cached) return cached;
    let items = await Product.list();
    if (query.status) {
      items = items.filter((item) => String(item.status || "").toLowerCase() === String(query.status).toLowerCase());
    }
    if (query.categoryId) {
      items = items.filter((item) => item.categoryId === String(query.categoryId));
    }
    if (query.search) {
      const search = String(query.search).trim().toLowerCase();
      items = items.filter((item) =>
        [item.name, item.sku, item.description, item.categoryName]
          .some((value) => String(value || "").toLowerCase().includes(search))
      );
    }
    const sort = normalizeSort(query.sort).trim();
    if (sort === "-createdAt") {
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sort === "createdAt") {
      items.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sort === "name") {
      items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }
    const total = items.length;
    items = items.slice(skip, skip + limit);
    return cacheService.set(key, { items, meta: paginationMeta(total, page, limit) }, 180);
  },
  async getById(id) {
    const product = await Product.findOne({ _id: id });
    if (!product) throw new AppError("Product not found", 404);
    return product;
  },
  async update(id, payload, files = []) {
    const images = [];
    for (const file of files) images.push(await fileService.uploadImage(file));
    const product = await Product.update(id, {
      ...payload,
      ...(images.length ? { images: images.filter(Boolean) } : {}),
    });
    if (!product) throw new AppError("Product not found", 404);
    await cacheService.del("products:*");
    return product;
  },
  async remove(id) {
    const existing = await Product.findOne({ _id: id });
    if (!existing) throw new AppError("Product not found", 404);
    await Product.remove(id);
    await cacheService.del("products:*");
    return existing;
  },
  async lowStock() {
    const products = await Product.list();
    return products
      .filter((item) => item.active !== false && Number(item.stock || 0) <= Number(item.lowStockThreshold || 0))
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
  },
};
