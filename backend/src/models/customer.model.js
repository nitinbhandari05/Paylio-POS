import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/customers.json"));

const normalize = (value) => (value || "").trim().toLowerCase();

const Customer = {
  list: async () => store.read(),

  findOne: async (query = {}) => {
    const customers = await store.read();

    if (query._id) {
      return customers.find((item) => item._id === String(query._id)) || null;
    }

    if (query.email) {
      const email = normalize(query.email);
      return customers.find((item) => normalize(item.email) === email) || null;
    }

    if (query.phone) {
      const phone = normalize(query.phone);
      return customers.find((item) => normalize(item.phone) === phone) || null;
    }

    return customers.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const customers = await store.read();
    const name = (payload.name || "").trim();

    if (!name) {
      throw new Error("Customer name is required");
    }

    const email = normalize(payload.email);
    const phone = normalize(payload.phone);

    if (email && customers.some((item) => normalize(item.email) === email)) {
      throw new Error("Customer email already exists");
    }

    if (phone && customers.some((item) => normalize(item.phone) === phone)) {
      throw new Error("Customer phone already exists");
    }

    const now = new Date().toISOString();
    const customer = {
      _id: randomUUID(),
      name,
      phone: payload.phone || "",
      email: payload.email || "",
      address: payload.address || "",
      notes: payload.notes || "",
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      createdAt: now,
      updatedAt: now,
    };

    customers.push(customer);
    await store.write(customers);

    return customer;
  },

  update: async (id, payload = {}) => {
    const customers = await store.read();
    const index = customers.findIndex((item) => item._id === String(id));

    if (index === -1) {
      return null;
    }

    if (payload.name !== undefined) {
      const nextName = payload.name.trim();
      if (!nextName) {
        throw new Error("Customer name is required");
      }
      customers[index].name = nextName;
    }

    if (payload.phone !== undefined) {
      customers[index].phone = payload.phone;
    }

    if (payload.email !== undefined) {
      customers[index].email = payload.email;
    }

    if (payload.address !== undefined) {
      customers[index].address = payload.address;
    }

    if (payload.notes !== undefined) {
      customers[index].notes = payload.notes;
    }

    if (payload.active !== undefined) {
      customers[index].active = Boolean(payload.active);
    }

    customers[index].updatedAt = new Date().toISOString();
    await store.write(customers);

    return customers[index];
  },

  remove: async (id) => {
    const customers = await store.read();
    const filtered = customers.filter((item) => item._id !== String(id));

    if (filtered.length === customers.length) {
      return false;
    }

    await store.write(filtered);
    return true;
  },
};

export default Customer;
