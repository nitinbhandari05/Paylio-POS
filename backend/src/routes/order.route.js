import { Router } from "express";
import { cancelOrder, createOrder, getOrder, invoice, listOrders, refundOrder, updateOrderStatus } from "../controllers/order.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/error.middleware.js";
import { mongoIdParam, orderValidator } from "../validators/common.validator.js";

const router = Router();

router.route("/")
  .post(protect, authorize("admin", "manager", "cashier"), orderValidator, validateRequest, createOrder)
  .get(protect, listOrders);
router.get("/:id", protect, mongoIdParam(), validateRequest, getOrder);
router.patch("/:id/status", protect, authorize("admin", "manager"), mongoIdParam(), validateRequest, updateOrderStatus);
router.post("/:id/cancel", protect, authorize("admin", "manager"), mongoIdParam(), validateRequest, cancelOrder);
router.post("/:id/refund", protect, authorize("admin", "manager"), mongoIdParam(), validateRequest, refundOrder);
router.get("/:id/invoice", protect, mongoIdParam(), validateRequest, invoice);

export default router;
