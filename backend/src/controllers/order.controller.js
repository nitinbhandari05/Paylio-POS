import { generateInvoiceNumber } from "../utils/generateInvoice.js";

export const createOrder = async (req, res) => {
  try {
    const { items, payments, discount = 0 } = req.body;

    let subtotal = 0;

    const updatedItems = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.productId);

        if (!product) throw new Error("Product not found");

        const price = product.price;
        const total = price * item.quantity;

        subtotal += total;

        // Stock update
        product.stock -= item.quantity;
        await product.save();

        return {
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          price
        };
      })
    );

    const discountedAmount = subtotal - discount;
    const tax = discountedAmount * 0.05;
    const totalAmount = discountedAmount + tax;

    const order = await Order.create({
      items: updatedItems,
      subtotal,
      discount,
      tax,
      totalAmount,
      payments,
      invoiceNumber: generateInvoiceNumber(),
      createdBy: req.user.id
    });

    res.status(201).json(order);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};