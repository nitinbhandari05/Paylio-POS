import express from "express";
import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const carts = await Cart.list();
  res.json({ carts });
});

router.post("/", async (req, res) => {
  try {
    const cart = await Cart.create({
      ...req.body,
      createdBy: req.user?.id || null,
    });

    res.status(201).json({ message: "Cart created", cart });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  const cart = await Cart.findOne({ _id: req.params.id });
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  res.json({ cart });
});

router.patch("/:id/customer", async (req, res) => {
  try {
    const cart = await Cart.setCustomer(req.params.id, req.body);
    res.json({ message: "Customer attached to cart", cart });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id/discount", async (req, res) => {
  try {
    const cart = await Cart.updateDiscount(req.params.id, req.body);
    res.json({ message: "Cart discount updated", cart });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/items", async (req, res) => {
  try {
    const cart = await Cart.addItem(req.params.id, req.body);
    res.status(201).json({ message: "Item added to cart", cart });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id/items/:itemId", async (req, res) => {
  try {
    const cart = await Cart.updateItem(req.params.id, req.params.itemId, req.body);
    res.json({ message: "Cart item updated", cart });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id/items/:itemId", async (req, res) => {
  try {
    const cart = await Cart.removeItem(req.params.id, req.params.itemId);
    res.json({ message: "Cart item removed", cart });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id/clear", async (req, res) => {
  const cart = await Cart.clear(req.params.id);
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  res.json({ message: "Cart cleared", cart });
});

router.get("/:id/totals", async (req, res) => {
  const cart = await Cart.findOne({ _id: req.params.id });
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  res.json({ totals: cart });
});

router.post("/:id/checkout", async (req, res) => {
  try {
    const order = await Order.createFromCart(req.params.id, {
      ...req.body,
      createdBy: req.user?.id || null,
    });

    res.status(201).json({ message: "Order created", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
