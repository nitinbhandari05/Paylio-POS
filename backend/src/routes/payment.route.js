import { Router } from "express";
import { createPayment, getPayment, paymentWebhook } from "../controllers/payment.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/error.middleware.js";
import { mongoIdParam } from "../validators/common.validator.js";

const router = Router();

router.post("/create", protect, createPayment);
router.post("/webhook", paymentWebhook);
router.get("/:id", protect, mongoIdParam(), validateRequest, getPayment);

export default router;
