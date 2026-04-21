import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";
import Organization from "./organization.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/subscriptions.json"));

const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    monthlyINR: 1499,
    maxOutlets: 1,
    maxUsers: 10,
    realtimeSeats: 2,
    features: ["POS Billing", "Inventory", "GST Invoicing", "Basic CRM"],
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthlyINR: 3999,
    maxOutlets: 3,
    maxUsers: 40,
    realtimeSeats: 8,
    features: ["All Starter features", "KDS", "Advanced Reports", "Role Workflows"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyINR: 9999,
    maxOutlets: 999,
    maxUsers: 999,
    realtimeSeats: 999,
    features: ["All Growth features", "Multi-company controls", "SLA support", "Custom Integrations"],
  },
};

const isTrialValid = (subscription) => {
  if (subscription.status !== "trial") return false;
  const trialEndsAt = new Date(subscription.trialEndsAt || "").getTime();
  return Number.isFinite(trialEndsAt) && trialEndsAt > Date.now();
};

const ensureDefaultSubscription = async () => {
  const subscriptions = await store.read();
  if (subscriptions.length) {
    return subscriptions;
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const seeded = [
    {
      _id: randomUUID(),
      organizationId: Organization.DEFAULT_ORG_ID,
      planId: "growth",
      status: "active",
      billingCycle: "monthly",
      autoRenew: true,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      updatedAt: now.toISOString(),
      createdAt: now.toISOString(),
    },
  ];
  await store.write(seeded);
  return seeded;
};

const normalizePlanId = (planId) => {
  const value = String(planId || "").trim().toLowerCase();
  return PLANS[value] ? value : "starter";
};

const Subscription = {
  PLANS,

  listPlans: async () => Object.values(PLANS),

  getByOrganization: async (organizationId) => {
    const subscriptions = await ensureDefaultSubscription();
    const orgId = String(organizationId || Organization.DEFAULT_ORG_ID);
    let subscription =
      subscriptions.find((item) => item.organizationId === orgId) || null;

    if (!subscription) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      subscription = {
        _id: randomUUID(),
        organizationId: orgId,
        planId: "starter",
        status: "trial",
        billingCycle: "monthly",
        autoRenew: true,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: trialEnd.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        updatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      };
      subscriptions.push(subscription);
      await store.write(subscriptions);
    }

    return {
      ...subscription,
      plan: PLANS[normalizePlanId(subscription.planId)],
      isActive:
        subscription.status === "active" ||
        (subscription.status === "trial" && isTrialValid(subscription)),
    };
  },

  assertActive: async (organizationId) => {
    const subscription = await Subscription.getByOrganization(organizationId);
    if (!subscription.isActive) {
      throw new Error("Subscription inactive. Please renew your plan.");
    }
    return subscription;
  },

  updateByOrganization: async (organizationId, payload = {}) => {
    const subscriptions = await ensureDefaultSubscription();
    const orgId = String(organizationId || Organization.DEFAULT_ORG_ID);
    const index = subscriptions.findIndex((item) => item.organizationId === orgId);
    if (index === -1) {
      return null;
    }

    if (payload.planId !== undefined) {
      subscriptions[index].planId = normalizePlanId(payload.planId);
    }
    if (payload.status !== undefined) {
      subscriptions[index].status = String(payload.status || "active").trim().toLowerCase();
    }
    if (payload.autoRenew !== undefined) {
      subscriptions[index].autoRenew = Boolean(payload.autoRenew);
    }
    if (payload.currentPeriodEnd !== undefined) {
      subscriptions[index].currentPeriodEnd = payload.currentPeriodEnd;
    }
    subscriptions[index].updatedAt = new Date().toISOString();

    await store.write(subscriptions);
    return Subscription.getByOrganization(orgId);
  },
};

export default Subscription;
