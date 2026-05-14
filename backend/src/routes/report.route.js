import { Router } from "express";
import { dailySales, monthlySales, revenue, topCustomers, topProducts } from "../controllers/report.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect, authorize("admin", "manager"));
router.get("/sales/daily", dailySales);
router.get("/sales/monthly", monthlySales);
router.get("/top-products", topProducts);
router.get("/top-customers", topCustomers);
router.get("/revenue", revenue);

export default router;
