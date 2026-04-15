import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  type: {
    type: String,
    enum: ["in", "out", "adjust"],
    required: true
  },

  quantity: {
    type: Number,
    required: true
  },

  beforeStock: Number,
  afterStock: Number,

  note: String

}, { timestamps: true });

export default mongoose.model("Inventory", inventorySchema);