import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    transactionId: { type: String, required: true, unique: true },
    gateway: { type: String, default: "razorpay_mock" },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["created", "authorized", "paid", "failed", "refunded"], default: "created", index: true },
    paidAt: Date,
    rawPayload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
