import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  sku: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },

  description: {
    type: String,
    default: ""
  },

  price: {
    type: Number,
    required: true
  },

  cost: {
    type: Number,
    default: 0
  },

  stock: {
    type: Number,
    default: 0
  },

  unit: {
    type: String,
    default: "pcs"
  },

  // ✅ GST Tax Rate
  taxRate: {
    type: Number,
    default: 5 // 5%, 12%, 18%
  },

  lowStockThreshold: {
    type: Number,
    default: 5
  },

  active: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

export default mongoose.model("Product", productSchema);