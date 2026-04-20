import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createArrayStore } from "./localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/print-jobs.json"));

export const buildKotText = (order) => {
  const lines = [
    `KOT ${order.kotNumber}`,
    `Invoice ${order.invoiceNumber}`,
    `Customer ${order.customerName || "Walk-in"}`,
    "",
    "Items:",
    ...order.items.map((item) => `${item.quantity} x ${item.name}`),
    "",
    `Status: ${order.status}`,
  ];

  return lines.join("\n");
};

export const buildReceiptText = (order) => {
  const itemLines = order.items.map(
    (item) => `${item.quantity} x ${item.name} @ ${item.unitPrice} = ${item.lineTotal}`
  );

  const paymentLines = (order.payments || []).map(
    (payment) => `${payment.method.toUpperCase()}: ${payment.amount}`
  );

  return [
    `Invoice ${order.invoiceNumber}`,
    `KOT ${order.kotNumber || "-"}`,
    `Customer ${order.customerName || "Walk-in"}`,
    `Phone ${order.customerPhone || "-"}`,
    "",
    ...itemLines,
    "",
    `Subtotal: ${order.subtotal}`,
    `Discount: ${order.discountAmount || 0}`,
    `GST: ${order.gstAmount}`,
    `Total: ${order.total}`,
    `Paid: ${order.amountPaid}`,
    `Change: ${order.changeDue}`,
    "",
    "Payments:",
    ...(paymentLines.length ? paymentLines : ["N/A"]),
  ].join("\n");
};

export const queuePrintJob = async ({ type, orderId, content, copies = 1 }) => {
  const jobs = await store.read();
  const now = new Date().toISOString();

  const job = {
    _id: randomUUID(),
    type,
    orderId,
    content,
    copies,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };

  jobs.push(job);
  await store.write(jobs);

  return job;
};
