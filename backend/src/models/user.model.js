import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";
import Organization from "./organization.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/users.json"));

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizePin = (pin) => String(pin || "").trim();
const normalizePhone = (phone) => String(phone || "").trim();

const User = {
  list: async () => store.read(),

  findOne: async (query = {}) => {
    const users = await store.read();

    if (query._id) {
      return users.find((item) => item._id === String(query._id)) || null;
    }

    if (query.email) {
      const email = normalizeEmail(query.email);
      return users.find((item) => normalizeEmail(item.email) === email) || null;
    }

    if (query.pin) {
      const pin = normalizePin(query.pin);
      return users.find((item) => normalizePin(item.pin) === pin) || null;
    }

    if (query.phone) {
      const phone = normalizePhone(query.phone);
      return users.find((item) => normalizePhone(item.phone) === phone) || null;
    }

    return users.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const users = await store.read();
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    if (!email && !phone) {
      throw new Error("Email or phone is required");
    }

    const hasEmailConflict = email
      ? users.some((item) => normalizeEmail(item.email) === email)
      : false;
    if (hasEmailConflict) {
      throw new Error("User already exists");
    }
    const hasPhoneConflict = phone
      ? users.some((item) => normalizePhone(item.phone) === phone)
      : false;
    if (hasPhoneConflict) {
      throw new Error("Phone is already registered");
    }

    const now = new Date().toISOString();
    const user = {
      _id: randomUUID(),
      name: payload.name || "",
      email,
      phone,
      password: payload.password || "",
      pin: normalizePin(payload.pin),
      role: payload.role || "cashier",
      outletId: payload.outletId || process.env.DEFAULT_OUTLET_ID || "main",
      organizationId: payload.organizationId || Organization.DEFAULT_ORG_ID,
      accessibleOutletIds: Array.isArray(payload.accessibleOutletIds)
        ? payload.accessibleOutletIds
        : [payload.outletId || process.env.DEFAULT_OUTLET_ID || "main"],
      isHeadOffice: Boolean(payload.isHeadOffice),
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      createdAt: now,
      updatedAt: now,
    };

    users.push(user);
    await store.write(users);
    return user;
  },

  update: async (id, payload = {}) => {
    const users = await store.read();
    const index = users.findIndex((item) => item._id === String(id));
    if (index === -1) {
      return null;
    }

    if (payload.name !== undefined) users[index].name = payload.name;
    if (payload.password !== undefined) users[index].password = payload.password;
    if (payload.pin !== undefined) users[index].pin = normalizePin(payload.pin);
    if (payload.phone !== undefined) users[index].phone = normalizePhone(payload.phone);
    if (payload.role !== undefined) users[index].role = payload.role;
    if (payload.outletId !== undefined) users[index].outletId = payload.outletId;
    if (payload.organizationId !== undefined) users[index].organizationId = payload.organizationId;
    if (payload.accessibleOutletIds !== undefined) {
      users[index].accessibleOutletIds = Array.isArray(payload.accessibleOutletIds)
        ? payload.accessibleOutletIds
        : [];
    }
    if (payload.isHeadOffice !== undefined) users[index].isHeadOffice = Boolean(payload.isHeadOffice);
    if (payload.active !== undefined) users[index].active = Boolean(payload.active);
    if (payload.refreshTokens !== undefined) {
      users[index].refreshTokens = Array.isArray(payload.refreshTokens) ? payload.refreshTokens : [];
    }
    if (payload.lastLogin !== undefined) users[index].lastLogin = payload.lastLogin;
    users[index].updatedAt = new Date().toISOString();

    await store.write(users);
    return users[index];
  },

  removeRefreshToken: async (id, refreshToken) => {
    const users = await store.read();
    const index = users.findIndex((item) => item._id === String(id));
    if (index === -1) {
      return null;
    }

    users[index].refreshTokens = (users[index].refreshTokens || []).filter(
      (item) => item.token !== refreshToken
    );
    users[index].updatedAt = new Date().toISOString();

    await store.write(users);
    return users[index];
  },
};

export default User;
