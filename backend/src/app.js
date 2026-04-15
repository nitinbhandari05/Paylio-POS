import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import cartRoutes from "./routes/cart.route.js";
import categoryRoutes from "./routes/category.route.js";
import customerRoutes from "./routes/customer.route.js";
import orderRoutes from "./routes/order.route.js";
import productRoutes from "./routes/product.route.js";
import inventoryRoutes from "./routes/inventory.route.js";


import { protect } from "./middlewares/auth.middleware.js";
import { authorize } from "./middlewares/role.middleware.js";

const app = express();

// 🔹 Middleware
app.use(cors());
app.use(express.json());

// 🔹 Health Check
app.get("/", (req, res) => {
  res.send("POS API Running 🚀");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

// 🔹 Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", protect, customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/carts", protect, cartRoutes);
app.use("/api/orders", protect, orderRoutes);

// 🔹 Admin Route
app.get("/api/admin", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

export default app;