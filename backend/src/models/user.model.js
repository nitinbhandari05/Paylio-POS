import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/users.json"));

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

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

    return users.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const users = await store.read();
    const email = normalizeEmail(payload.email);
    if (!email) {
      throw new Error("Email is required");
    }

    const existing = users.find((item) => normalizeEmail(item.email) === email);
    if (existing) {
      throw new Error("User already exists");
    }

    const now = new Date().toISOString();
    const user = {
      _id: randomUUID(),
      name: payload.name || "",
      email,
      password: payload.password || "",
      role: payload.role || "cashier",
      outletId: payload.outletId || process.env.DEFAULT_OUTLET_ID || "main",
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
    if (payload.role !== undefined) users[index].role = payload.role;
    if (payload.outletId !== undefined) users[index].outletId = payload.outletId;
    if (payload.isHeadOffice !== undefined) users[index].isHeadOffice = Boolean(payload.isHeadOffice);
    if (payload.active !== undefined) users[index].active = Boolean(payload.active);
    users[index].updatedAt = new Date().toISOString();

    await store.write(users);
    return users[index];
  },
};

export default User;
