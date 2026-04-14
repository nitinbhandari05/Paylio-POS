import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createObjectStore } from "./objectStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createObjectStore(resolve(__dirname, "../../data/counters.json"));

const getDateKey = (date = new Date()) =>
  date.toISOString().slice(0, 10).replace(/-/g, "");

const nextCounter = async (bucket, dateKey) => {
  const counters = await store.read();
  const nextValue = ((counters?.[bucket]?.[dateKey] || 0) + 1);

  counters[bucket] = counters[bucket] || {};
  counters[bucket][dateKey] = nextValue;
  await store.write(counters);

  return nextValue;
};

export const generateInvoiceNumber = async () => {
  const dateKey = getDateKey();
  const seq = await nextCounter("invoice", dateKey);
  return `INV-${dateKey}-${String(seq).padStart(4, "0")}`;
};

export const generateRefundNumber = async () => {
  const dateKey = getDateKey();
  const seq = await nextCounter("refund", dateKey);
  return `RFD-${dateKey}-${String(seq).padStart(4, "0")}`;
};
