import express from "express";
import Branch from "../models/branch.model.js";
import Inventory from "../models/inventory.model.js";
import Order from "../models/order.model.js";
import Organization from "../models/organization.model.js";
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import { requireRoles } from "../middlewares/outlet.middleware.js";
import {
  attachSubscriptionContext,
  requireActiveSubscription,
} from "../middlewares/subscription.middleware.js";

const router = express.Router();

const ROLE_MATRIX = {
  superadmin: ["All clients", "All outlets", "Subscription billing", "Support tools"],
  owner: ["Full outlet access", "Reports", "Staff management", "Products", "Finance", "Settings"],
  manager: ["Orders", "Refund approval", "Inventory", "Staff shifts", "Reports (limited)", "Table management"],
  cashier: ["POS billing", "Apply allowed discounts", "Print invoice", "View today's orders"],
  waiter: ["Create table orders", "Update table status", "Request bill"],
  kitchen: ["Kitchen screen only", "Update status (Preparing / Ready)"],
  accountant: ["GST reports", "Expenses", "Profit/loss", "Exports"],
  admin: ["Branch setup", "Staff assignment", "Catalog + pricing", "Reports"],
};

const toNum = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

router.use(attachSubscriptionContext);

router.get("/me", requireActiveSubscription, async (req, res) => {
  const [organization, branches, users] = await Promise.all([
    Organization.findOne({ _id: req.organizationId }),
    Branch.list(),
    User.list(),
  ]);

  res.json({
    organizationId: req.organizationId,
    organization,
    subscription: req.subscription,
    roleMatrix: ROLE_MATRIX,
    branchCount: branches.length,
    staffCount: users.length,
  });
});

router.get("/roles-matrix", (_req, res) => {
  res.json({ roles: ROLE_MATRIX });
});

router.get("/owner-dashboard", requireActiveSubscription, async (req, res) => {
  const [orders, branches, users, stockSummary] = await Promise.all([
    Order.list(),
    Branch.list(),
    User.list(),
    Inventory.summaryByOutlet(),
  ]);

  const recentOrders = orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);

  const completed = orders.filter((order) => order.status === "completed");
  const refunded = orders.filter((order) => order.status === "refunded");
  const pendingKitchen = orders.filter((order) =>
    ["pending", "accepted", "preparing"].includes(String(order.status || "").toLowerCase())
  ).length;

  const totalSales = completed.reduce((sum, order) => sum + toNum(order.total), 0);
  const totalTax = completed.reduce((sum, order) => sum + toNum(order.gstAmount), 0);
  const totalRefunds = refunded.reduce(
    (sum, order) => sum + toNum(order.refundAmount || order.total),
    0
  );

  const salesByOutlet = new Map();
  for (const order of orders) {
    const outletId = order.outletId || "main";
    const current = salesByOutlet.get(outletId) || { outletId, orders: 0, revenue: 0 };
    current.orders += 1;
    if (order.status === "completed") current.revenue += toNum(order.total);
    salesByOutlet.set(outletId, current);
  }

  const branchNameMap = new Map(branches.map((branch) => [branch._id, branch.name]));
  const outlets = [...salesByOutlet.values()]
    .map((row) => ({
      ...row,
      name: branchNameMap.get(row.outletId) || row.outletId,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  res.json({
    generatedAt: new Date().toISOString(),
    organizationId: req.organizationId,
    subscription: req.subscription,
    kpis: {
      totalOrders: orders.length,
      totalSales,
      netSales: totalSales - totalRefunds,
      totalTax,
      totalRefunds,
      pendingKitchen,
      activeBranches: branches.filter((branch) => branch.active !== false).length,
      totalBranches: branches.length,
      totalStaff: users.length,
    },
    stockSummary,
    outlets,
    recentOrders: recentOrders.map((order) => ({
      id: order._id,
      invoiceNumber: order.invoiceNumber,
      outletId: order.outletId,
      outletName: branchNameMap.get(order.outletId) || order.outletId,
      customerName: order.customerName || "Walk-in",
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
    })),
  });
});

router.patch(
  "/subscription",
  requireRoles("admin", "owner", "superadmin", "headoffice"),
  async (req, res) => {
    try {
      const subscription = await Subscription.updateByOrganization(req.organizationId, req.body);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.json({ message: "Subscription updated", subscription });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/organizations",
  requireRoles("admin", "owner", "superadmin", "headoffice"),
  async (req, res) => {
    try {
      const organization = await Organization.create(req.body);
      const subscription = await Subscription.getByOrganization(organization._id);
      res.status(201).json({ message: "Organization created", organization, subscription });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

export default router;
