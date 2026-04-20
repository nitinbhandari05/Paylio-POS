import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import cartRoutes from "./routes/cart.route.js";
import branchRoutes from "./routes/branch.route.js";
import categoryRoutes from "./routes/category.route.js";
import customerRoutes from "./routes/customer.route.js";
import deliveryRoutes from "./routes/delivery.route.js";
import headOfficeRoutes from "./routes/head-office.route.js";
import orderRoutes from "./routes/order.route.js";
import orderTrackingRoutes from "./routes/order-tracking.route.js";
import promoRoutes from "./routes/promo.route.js";
import productRoutes from "./routes/product.route.js";
import inventoryRoutes from "./routes/inventory.route.js";
import staffRoutes from "./routes/staff.route.js";
import tableRoutes from "./routes/table.route.js";
import publicOrderRoutes from "./routes/public-order.route.js";


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
app.use("/api/branches", protect, branchRoutes);
app.use("/api/customers", protect, customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/public", publicOrderRoutes);
app.use("/api/inventory", protect, inventoryRoutes);
app.use("/api/carts", protect, cartRoutes);
app.use("/api/orders", protect, orderRoutes);
app.use("/api/order-tracking", orderTrackingRoutes);
app.use("/api/tables", protect, tableRoutes);
app.use("/api/delivery", protect, deliveryRoutes);
app.use("/api/promos", protect, promoRoutes);
app.use("/api/head-office", protect, headOfficeRoutes);
app.use("/api/staff", protect, staffRoutes);

// 🔹 Admin Route
app.get("/api/admin", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

export default app;
