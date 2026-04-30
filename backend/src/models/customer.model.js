import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/customers.json"));

const normalize = (payload = {}) => ({
  _id: payload._id || randomUUID(),
  name: String(payload.name || "").trim(),
  phone: String(payload.phone || "").trim(),
  email: String(payload.email || "").trim().toLowerCase(),
  address: String(payload.address || "").trim(),
  notes: String(payload.notes || "").trim(),
  active: payload.active !== false,
  createdAt: payload.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const Customer = {
  create: async (payload = {}) => {
    if (!String(payload.name || "").trim()) {
      throw new Error("Customer name is required");
    }
    const rows = await store.read();
    const customer = normalize(payload);
    rows.push(customer);
    await store.write(rows);
    return customer;
  },

  find: async () => store.read(),

  findById: async (id) => {
    const rows = await store.read();
    return rows.find((row) => row._id === String(id)) || null;
  },

  findByIdAndUpdate: async (id, payload = {}, options = {}) => {
    const rows = await store.read();
    const index = rows.findIndex((row) => row._id === String(id));
    if (index === -1) return null;
    const next = normalize({ ...rows[index], ...payload, _id: rows[index]._id, createdAt: rows[index].createdAt });
    rows[index] = next;
    await store.write(rows);
    return options?.new ? next : rows[index];
  },

  findByIdAndDelete: async (id) => {
    const rows = await store.read();
    const index = rows.findIndex((row) => row._id === String(id));
    if (index === -1) return null;
    const [removed] = rows.splice(index, 1);
    await store.write(rows);
    return removed;
  },
};

export default Customer;

