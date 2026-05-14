import crypto from "node:crypto";
import Product from "../models/Product.js";
import { cacheService } from "./cache.service.js";
import { fileService } from "./file.service.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { AppError } from "../utils/AppError.js";

const makeBarcode = () => crypto.randomInt(100000000000, 999999999999).toString();
const normalizeSort = (sort = "-createdAt") => String(sort).replace(/,/g, " ");

export const productService = {
  async create(payload, files = [], userId) {
    const images = [];
    for (const file of files) images.push(await fileService.uploadImage(file));
    const product = await Product.create({
      ...payload,
      sku: String(payload.sku).toUpperCase(),
      barcode: payload.barcode || makeBarcode(),
      images: images.filter(Boolean),
      createdBy: userId,
    });
    await cacheService.del("products:*");
    return product.populate("categoryId");
  },
  async list(query) {
    const { page, limit, skip } = getPagination(query);
    const key = cacheService.key("products", query);
    const cached = await cacheService.get(key);
    if (cached) return cached;
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.search) filter.$text = { $search: query.search };
    const [items, total] = await Promise.all([
      Product.find(filter).populate("categoryId").sort(normalizeSort(query.sort)).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);
    return cacheService.set(key, { items, meta: paginationMeta(total, page, limit) }, 180);
  },
  async getById(id) {
    const product = await Product.findById(id).populate("categoryId");
    if (!product) throw new AppError("Product not found", 404);
    return product;
  },
  async update(id, payload, files = []) {
    const images = [];
    for (const file of files) images.push(await fileService.uploadImage(file));
    const product = await Product.findByIdAndUpdate(
      id,
      { ...payload, ...(images.length ? { $push: { images: { $each: images.filter(Boolean) } } } : {}) },
      { new: true, runValidators: true }
    ).populate("categoryId");
    if (!product) throw new AppError("Product not found", 404);
    await cacheService.del("products:*");
    return product;
  },
  async remove(id) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new AppError("Product not found", 404);
    await cacheService.del("products:*");
    return product;
  },
  async lowStock() {
    return Product.find({ $expr: { $lte: ["$stock", "$lowStockThreshold"] }, status: "active" }).sort("stock");
  },
};
