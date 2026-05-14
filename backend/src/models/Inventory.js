import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    previousStock: { type: Number, required: true },
    updatedStock: { type: Number, required: true },
    quantity: { type: Number, required: true },
    operationType: { type: String, enum: ["ADD", "REMOVE", "SALE", "RETURN"], required: true, index: true },
    reason: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

inventorySchema.index({ productId: 1, createdAt: -1 });

export default mongoose.models.Inventory || mongoose.model("Inventory", inventorySchema);
