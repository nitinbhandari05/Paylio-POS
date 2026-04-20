import express from "express";
import Order from "../models/order.model.js";
import Inventory from "../models/inventory.model.js";
import Branch from "../models/branch.model.js";
import User from "../models/user.model.js";
import { requireHeadOffice } from "../middlewares/outlet.middleware.js";

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

router.get("/reporting/summary", requireHeadOffice, async (_req, res) => {
  const [orders, stockByOutlet, branches, users] = await Promise.all([
    Order.list(),
    Inventory.summaryByOutlet(),
    Branch.list(),
    User.list(),
  ]);

  const branchMap = new Map(branches.map((branch) => [branch._id, branch]));
  const salesByOutletMap = new Map();
  const orderTypeBreakdown = {};

  for (const order of orders) {
    const outletId = order.outletId || "main";
    const orderType = String(order.orderType || "dinein").toLowerCase();
    orderTypeBreakdown[orderType] = (orderTypeBreakdown[orderType] || 0) + 1;
    const existing = salesByOutletMap.get(outletId) || {
      outletId,
      orders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      refundedOrders: 0,
      grossSales: 0,
      refunds: 0,
      tax: 0,
      netSales: 0,
    };

    existing.orders += 1;
    if (order.status === "completed") existing.completedOrders += 1;
    if (order.status === "cancelled") existing.cancelledOrders += 1;
    if (order.status === "refunded") existing.refundedOrders += 1;
    existing.grossSales += toNumber(order.total, 0);
    existing.refunds += toNumber(order.refundAmount, 0);
    existing.tax += toNumber(order.gstAmount, 0);
    existing.netSales = existing.grossSales - existing.refunds;

    salesByOutletMap.set(outletId, existing);
  }

  const salesByOutlet = [...salesByOutletMap.values()].map((summary) => {
    const branch = branchMap.get(summary.outletId);
    return {
      ...summary,
      outletName: branch?.name || summary.outletId,
      outletCode: branch?.code || "",
    };
  });

  const staffByOutletMap = new Map();
  for (const user of users) {
    const outletId = user.outletId || "main";
    const role = String(user.role || "unknown").toLowerCase();
    const current = staffByOutletMap.get(outletId) || { outletId, totalStaff: 0, roles: {} };
    current.totalStaff += 1;
    current.roles[role] = (current.roles[role] || 0) + 1;
    staffByOutletMap.set(outletId, current);
  }

  const stockByOutletMap = new Map(
    stockByOutlet.map((item) => [item.outletId, item])
  );

  const staffByOutlet = [...staffByOutletMap.values()];
  const staffByOutletLookup = new Map(
    staffByOutlet.map((item) => [item.outletId, item])
  );
  const salesByOutletLookup = new Map(
    salesByOutlet.map((item) => [item.outletId, item])
  );

  const outletSummaries = branches.map((branch) => ({
    outletId: branch._id,
    outletName: branch.name,
    outletCode: branch.code,
    sales:
      salesByOutletLookup.get(branch._id) || {
        outletId: branch._id,
        outletName: branch.name,
        outletCode: branch.code,
        orders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        refundedOrders: 0,
        grossSales: 0,
        refunds: 0,
        tax: 0,
        netSales: 0,
      },
    stock:
      stockByOutletMap.get(branch._id) || {
        outletId: branch._id,
        productsCount: 0,
        totalUnits: 0,
      },
    staff:
      staffByOutletLookup.get(branch._id) || {
        outletId: branch._id,
        totalStaff: 0,
        roles: {},
      },
  }));

  res.json({
    totalOrders: orders.length,
    totalBranches: branches.length,
    orderTypeBreakdown,
    salesByOutlet,
    stockByOutlet,
    staffByOutlet,
    outletSummaries,
  });
});

export default router;
