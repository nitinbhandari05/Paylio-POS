import { Router } from "express";
import { createProduct, deleteProduct, getProduct, listProducts, lowStockProducts, updateProduct } from "../controllers/product.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/error.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { productValidator } from "../validators/common.validator.js";

const router = Router();

router.get("/low-stock", protect, lowStockProducts);
router.get("/search", protect, listProducts);
router.route("/")
  .post(protect, authorize("admin", "manager", "cashier"), upload.array("images", 5), productValidator, validateRequest, createProduct)
  .get(protect, listProducts);
router.route("/:id")
  .get(protect, getProduct)
  .patch(protect, authorize("admin", "manager", "cashier"), upload.array("images", 5), updateProduct)
  .delete(protect, authorize("admin"), deleteProduct);

export default router;
