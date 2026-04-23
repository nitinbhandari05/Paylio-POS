export const paymentSchema = {
  _id: "string",
  orderId: "string",
  invoiceId: "string",
  method: "cash|card|upi|wallet|other",
  provider: "razorpay|offline|other",
  amount: "number",
  currency: "string",
  status: "initiated|captured|failed|refunded",
  metadata: "object",
  createdAt: "date",
};
