import express from "express";
import compression from "compression";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import productRoutes from "./routes/product.route.js";
import categoryRoutes from "./routes/category.route.js";
import customerRoutes from "./routes/customer.route.js";
import orderRoutes from "./routes/order.route.js";
import paymentRoutes from "./routes/payment.route.js";
import inventoryRoutes from "./routes/inventory.route.js";
import reportRoutes from "./routes/report.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import publicOrderRoutes from "./routes/public-order.route.js";
import saasRoutes from "./routes/saas.route.js";
import { apiLimiter, corsMiddleware, securityMiddleware } from "./middleware/security.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { swaggerSpec } from "./config/swagger.js";
import { isProduction } from "./config/env.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDistPath = resolve(__dirname, "../../frontend/dist");
const serveFrontend = isProduction && existsSync(resolve(frontendDistPath, "index.html"));

const app = express();

app.set("trust proxy", 1);

app.use(corsMiddleware);
app.use(securityMiddleware);
app.use(apiLimiter);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));

app.get("/", (_req, res) => {
  if (serveFrontend) {
    return res.sendFile(resolve(frontendDistPath, "index.html"));
  }
  return res.json({ success: true, message: "Smart POS API Running" });
});
app.get("/health", (_req, res) => res.json({ ok: true, service: "smart-pos-backend" }));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/public", publicOrderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/saas", saasRoutes);

if (serveFrontend) {
  app.use(express.static(frontendDistPath, { index: false, maxAge: "1h", immutable: true }));
  app.get(/^\/(?!api\/|api$).*/, (req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.accepts("html")) {
      return res.sendFile(resolve(frontendDistPath, "index.html"));
    }
    return next();
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
