import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

categorySchema.index({ name: "text", description: "text" });

export default mongoose.models.Category || mongoose.model("Category", categorySchema);
