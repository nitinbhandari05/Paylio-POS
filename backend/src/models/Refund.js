import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    reason: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    refundStatus: { type: String, enum: ["queued", "processing", "success", "failed"], default: "queued", index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Refund || mongoose.model("Refund", refundSchema);
