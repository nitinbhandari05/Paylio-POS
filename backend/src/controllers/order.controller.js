import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { generateInvoiceNumber } from "../utils/generateInvoice.js";

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      items,
      payments,
      discountType = "flat",
      discountValue = 0
    } = req.body;

    // ✅ Validation
    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    let subtotal = 0;
    const updatedItems = [];

    // 🔹 Process Items
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const price = product.price;
      const total = price * item.quantity;

      subtotal += total;

      // Update stock
      product.stock -= item.quantity;
      await product.save({ session });

      updatedItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        unitPrice: price,
        total
      });
    }

    // 🔹 Discount Logic
    let discount = 0;

    if (discountType === "flat") {
      discount = discountValue;
    } else if (discountType === "percentage") {
      discount = (subtotal * discountValue) / 100;
    }

    // Prevent invalid discount
    if (discount > subtotal) {
      throw new Error("Discount cannot exceed subtotal");
    }

    const discountedAmount = subtotal - discount;

    // 🔹 Tax (GST 5%)
    const tax = discountedAmount * 0.05;
    const totalAmount = discountedAmount + tax;

    // 🔹 Payment Validation
    const paidAmount =
      payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    if (paidAmount < totalAmount) {
      throw new Error("Insufficient payment");
    }

    const invoiceNumber = await generateInvoiceNumber();

    const order = await Order.create(
      [
        {
          items: updatedItems,
          subtotal,
          discount,
          discountType,
          discountValue,
          tax,
          totalAmount,
          payments,
          invoiceNumber,
          createdBy: req.user.id
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(order[0]);

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({ error: error.message });
  }
};