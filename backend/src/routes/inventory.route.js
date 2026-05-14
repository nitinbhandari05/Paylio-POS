import { Router } from "express";
import { addStock, inventoryHistory, removeStock } from "../controllers/inventory.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/error.middleware.js";
import { inventoryValidator } from "../validators/common.validator.js";
import { param } from "express-validator";

const router = Router();

router.post("/add", protect, authorize("admin", "manager"), inventoryValidator, validateRequest, addStock);
router.post("/remove", protect, authorize("admin", "manager"), inventoryValidator, validateRequest, removeStock);
router.get("/history/:productId", protect, param("productId").isMongoId(), validateRequest, inventoryHistory);

export default router;
