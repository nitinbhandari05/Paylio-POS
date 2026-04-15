import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  address: String,
  notes: String,
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Customer", customerSchema);