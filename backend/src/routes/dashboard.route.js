import { Router } from "express";
import { dashboardStats, recentOrders, salesChart } from "../controllers/report.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect, authorize("admin", "manager"));
router.get("/stats", dashboardStats);
router.get("/recent-orders", recentOrders);
router.get("/sales-chart", salesChart);

export default router;
