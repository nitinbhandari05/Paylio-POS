import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/promo-codes.json"));

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateDiscount = (total, promo) => {
  const safeTotal = Math.max(0, toNumber(total, 0));
  if (!safeTotal) {
    return 0;
  }

  const discountType = String(promo.discountType || "flat").toLowerCase();
  const discountValue = Math.max(0, toNumber(promo.discountValue, 0));
  if (!discountValue) {
    return 0;
  }

  if (discountType === "percent") {
    const maxDiscount = promo.maxDiscountAmount
      ? toNumber(promo.maxDiscountAmount, safeTotal)
      : safeTotal;
    return Math.min((safeTotal * discountValue) / 100, maxDiscount, safeTotal);
  }

  return Math.min(discountValue, safeTotal);
};

const PromoCode = {
  list: async () => store.read(),

  findOne: async (query = {}) => {
    const promos = await store.read();

    if (query._id) {
      return promos.find((item) => item._id === String(query._id)) || null;
    }

    if (query.code) {
      const code = normalizeCode(query.code);
      return promos.find((item) => normalizeCode(item.code) === code) || null;
    }

    return promos.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const code = normalizeCode(payload.code);
    if (!code) {
      throw new Error("Promo code is required");
    }

    const promos = await store.read();
    const duplicate = promos.find((item) => normalizeCode(item.code) === code);
    if (duplicate) {
      throw new Error("Promo code already exists");
    }

    const now = new Date().toISOString();
    const promo = {
      _id: randomUUID(),
      code,
      title: payload.title || code,
      discountType: payload.discountType || "flat",
      discountValue: toNumber(payload.discountValue, 0),
      minOrderAmount: toNumber(payload.minOrderAmount, 0),
      maxDiscountAmount: toNumber(payload.maxDiscountAmount, 0),
      usageLimit: toNumber(payload.usageLimit, 0),
      usedCount: 0,
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      expiresAt: payload.expiresAt || "",
      createdAt: now,
      updatedAt: now,
    };

    promos.push(promo);
    await store.write(promos);
    return promo;
  },

  validate: async (code, totalAmount) => {
    const promo = await PromoCode.findOne({ code });
    if (!promo) {
      throw new Error("Promo code not found");
    }
    if (!promo.active) {
      throw new Error("Promo code is inactive");
    }
    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
      throw new Error("Promo code expired");
    }
    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      throw new Error("Promo code usage limit reached");
    }

    const total = toNumber(totalAmount, 0);
    if (total < toNumber(promo.minOrderAmount, 0)) {
      throw new Error("Order amount is below promo minimum");
    }

    return {
      promo,
      discountAmount: calculateDiscount(total, promo),
    };
  },

  consume: async (id) => {
    const promos = await store.read();
    const index = promos.findIndex((item) => item._id === String(id));
    if (index === -1) {
      return null;
    }
    promos[index].usedCount = toNumber(promos[index].usedCount, 0) + 1;
    promos[index].updatedAt = new Date().toISOString();
    await store.write(promos);
    return promos[index];
  },
};

export default PromoCode;
