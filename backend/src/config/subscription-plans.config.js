export const SUBSCRIPTION_PLANS = [
  {
    code: "starter",
    name: "Starter",
    priceInrMonthly: 999,
    outletLimit: 1,
    userLimit: 2,
    modules: ["pos"],
  },
  {
    code: "growth",
    name: "Growth",
    priceInrMonthly: 2999,
    outletLimit: 3,
    userLimit: 15,
    modules: ["pos", "inventory", "reports"],
  },
  {
    code: "pro",
    name: "Pro",
    priceInrMonthly: 6999,
    outletLimit: 10,
    userLimit: 80,
    modules: ["pos", "inventory", "reports", "crm", "loyalty", "kds"],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceInrMonthly: 14999,
    outletLimit: -1,
    userLimit: -1,
    modules: ["all", "franchise", "api", "white-label"],
  },
];

export const PLAN_ADDONS = [
  "payroll",
  "whatsapp-automation",
  "mobile-app",
  "website-ordering",
  "ai-reports",
  "advanced-analytics",
];

export const getPlanByCode = (code) =>
  SUBSCRIPTION_PLANS.find((plan) => plan.code === String(code || "").trim().toLowerCase()) || null;
