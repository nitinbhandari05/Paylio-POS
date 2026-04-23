import express from "express";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  normalizeRole,
  resolvePermissions,
} from "../config/rbac.config.js";
import {
  PLAN_ADDONS,
  SUBSCRIPTION_PLANS,
} from "../config/subscription-plans.config.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get("/blueprint", (_req, res) => {
  res.json({
    product: "Paylio Enterprise POS + ERP + SaaS",
    supportedModels: [
      "single-outlet",
      "multi-outlet-chain",
      "franchise",
      "cloud-kitchen",
      "food-court",
      "white-label",
    ],
    coreSuites: [
      "auth-security",
      "pos-billing",
      "inventory-procurement",
      "crm-loyalty",
      "reports-analytics",
      "staff-payroll",
      "subscriptions-billing",
      "franchise-control",
      "ai-assistant",
    ],
  });
});

router.get("/roles", (_req, res) => {
  res.json({
    roles: ROLES,
    permissions: PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS,
  });
});

router.get("/roles/:role", (req, res) => {
  const role = normalizeRole(req.params.role);
  const permissions = resolvePermissions(role);

  if (!permissions.length) {
    return res.status(404).json({ message: "Role not found", role });
  }

  res.json({ role, permissions });
});

router.get("/plans", (_req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS, addOns: PLAN_ADDONS });
});

router.get(
  "/onboarding/checklist",
  requirePermission(PERMISSIONS.OUTLET_CONTROL),
  (req, res) => {
    const role = normalizeRole(req.user?.role);

    res.json({
      role,
      checklist: [
        { id: "org", label: "Organization profile completed", done: Boolean(req.user?.organizationId) },
        { id: "outlet", label: "Outlet assigned", done: Boolean(req.user?.outletId) },
        { id: "catalog", label: "Menu catalog configured", done: false },
        { id: "inventory", label: "Opening stock uploaded", done: false },
        { id: "tax", label: "GST and invoice settings completed", done: false },
        { id: "staff", label: "Staff and roles invited", done: false },
        { id: "billing", label: "Test bill generated", done: false },
      ],
    });
  }
);

router.get(
  "/ai/insights",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  (_req, res) => {
    const now = new Date().toISOString();

    res.json({
      generatedAt: now,
      insights: [
        {
          id: "stock-shortage",
          title: "Predicted stock shortage",
          level: "warning",
          recommendation: "Milk and paneer are likely to run out in the next 2 days. Raise PO today.",
        },
        {
          id: "peak-hour",
          title: "Peak sales prediction",
          level: "info",
          recommendation: "Expected rush between 7:00 PM and 9:30 PM. Add one cashier and one kitchen runner.",
        },
        {
          id: "combo-optimization",
          title: "Smart combo recommendation",
          level: "success",
          recommendation: "Bundle Pizza Margherita + Cola at 8% off to improve average bill value.",
        },
      ],
    });
  }
);

export default router;
