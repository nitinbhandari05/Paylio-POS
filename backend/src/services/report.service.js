import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import { cacheService } from "./cache.service.js";

const dateRange = (from, to) => ({
  $gte: from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0)),
  $lte: to ? new Date(to) : new Date(),
});

export const reportService = {
  async sales(from, to, groupFormat = "%Y-%m-%d") {
    const key = cacheService.key("reports:sales", { from, to, groupFormat });
    const cached = await cacheService.get(key);
    if (cached) return cached;
    const data = await Order.aggregate([
      { $match: { createdAt: dateRange(from, to), orderStatus: { $ne: "cancelled" } } },
      { $group: { _id: { $dateToString: { format: groupFormat, date: "$createdAt" } }, orders: { $sum: 1 }, revenue: { $sum: "$grandTotal" }, tax: { $sum: "$taxAmount" } } },
      { $sort: { _id: 1 } },
    ]);
    return cacheService.set(key, data, 300);
  },
  topProducts(limit = 10) {
    return Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", name: { $first: "$items.name" }, quantity: { $sum: "$items.quantity" }, revenue: { $sum: "$items.lineTotal" } } },
      { $sort: { quantity: -1 } },
      { $limit: Number(limit) },
    ]);
  },
  topCustomers(limit = 10) {
    return Customer.find().sort("-totalSpent").limit(Number(limit));
  },
  revenue(from, to) {
    return Order.aggregate([
      { $match: { createdAt: dateRange(from, to), paymentStatus: "paid" } },
      { $group: { _id: null, revenue: { $sum: "$grandTotal" }, orders: { $sum: 1 }, avgOrderValue: { $avg: "$grandTotal" } } },
    ]);
  },
  async dashboardStats() {
    const key = "dashboard:stats";
    const cached = await cacheService.get(key);
    if (cached) return cached;
    const [orders, paid, customers, lowStock] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$grandTotal" } } }]),
      Customer.countDocuments(),
      (await import("../models/Product.js")).default.countDocuments({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } }),
    ]);
    return cacheService.set(key, { orders, revenue: paid[0]?.total || 0, customers, lowStock }, 120);
  },
};
