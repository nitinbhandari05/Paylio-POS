import Order from "../models/Order.js";
import { reportService } from "../services/report.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";

export const dailySales = asyncHandler(async (req, res) => successResponse(res, await reportService.sales(req.query.from, req.query.to), "Daily sales"));
export const monthlySales = asyncHandler(async (req, res) => successResponse(res, await reportService.sales(req.query.from, req.query.to, "%Y-%m"), "Monthly sales"));
export const topProducts = asyncHandler(async (req, res) => successResponse(res, await reportService.topProducts(req.query.limit), "Top products"));
export const topCustomers = asyncHandler(async (req, res) => successResponse(res, await reportService.topCustomers(req.query.limit), "Top customers"));
export const revenue = asyncHandler(async (req, res) => successResponse(res, await reportService.revenue(req.query.from, req.query.to), "Revenue"));
export const dashboardStats = asyncHandler(async (_req, res) => successResponse(res, await reportService.dashboardStats(), "Dashboard stats"));
export const recentOrders = asyncHandler(async (_req, res) => successResponse(res, await Order.find().sort("-createdAt").limit(10), "Recent orders"));
export const salesChart = asyncHandler(async (req, res) => successResponse(res, await reportService.sales(req.query.from, req.query.to), "Sales chart"));
