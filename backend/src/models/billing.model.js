import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/billing-invoices.json"));

const Billing = {
  listInvoices: async (organizationId = "org-main") => {
    const rows = await store.read();
    return rows
      .filter((row) => row.organizationId === String(organizationId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  createInvoice: async (payload = {}) => {
    const rows = await store.read();
    const now = new Date().toISOString();
    const invoice = {
      _id: randomUUID(),
      organizationId: String(payload.organizationId || "org-main"),
      planId: String(payload.planId || "starter"),
      planName: String(payload.planName || "Starter"),
      amount: Number(payload.amount || 0),
      currency: "INR",
      status: String(payload.status || "paid"),
      paymentMethod: String(payload.paymentMethod || "upi"),
      createdAt: now,
      dueAt: payload.dueAt || now,
    };
    rows.push(invoice);
    await store.write(rows);
    return invoice;
  },
};

export default Billing;

