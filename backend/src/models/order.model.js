import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  name: String,
  quantity: Number,
  unitPrice: Number,
  total: Number
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["cash", "card", "upi"]
  },
  amount: Number
});

const orderSchema = new mongoose.Schema({

  invoiceNumber: {
    type: String,
    unique: true
  },

  items: [orderItemSchema],

  subtotal: Number,
  discount: {
    type: Number,
    default: 0
  },

  tax: Number,
  totalAmount: Number,

  payments: [paymentSchema],

  status: {
    type: String,
    enum: ["completed", "cancelled", "refunded"],
    default: "completed"
  },

  customerName: String,
  customerPhone: String,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, { timestamps: true });

export default mongoose.model("Order", orderSchema);