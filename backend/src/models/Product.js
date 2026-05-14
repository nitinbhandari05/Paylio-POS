import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: { type: String, required: true, unique: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0, index: true },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    images: [imageSchema],
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", sku: "text", barcode: "text" });
productSchema.index({ categoryId: 1, status: 1 });

export default mongoose.models.Product || mongoose.model("Product", productSchema);
