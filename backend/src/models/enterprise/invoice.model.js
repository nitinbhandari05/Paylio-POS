export const invoiceSchema = {
  _id: "string",
  organizationId: "string",
  subscriptionId: "string",
  amount: "number",
  currency: "string",
  gstAmount: "number",
  status: "draft|issued|paid|failed|cancelled",
  dueDate: "date",
  issuedAt: "date",
  paidAt: "date",
};
