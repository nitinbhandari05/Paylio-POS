import { Router } from "express";
import Category from "../models/Category.js";
import { makeCrudController } from "../controllers/crud.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/error.middleware.js";
import { mongoIdParam } from "../validators/common.validator.js";

const router = Router();
const controller = makeCrudController(Category, "Category");

router.route("/").post(protect, authorize("admin", "manager"), controller.create).get(protect, controller.list);
router.route("/:id")
  .get(protect, mongoIdParam(), validateRequest, controller.get)
  .patch(protect, authorize("admin", "manager"), mongoIdParam(), validateRequest, controller.update)
  .delete(protect, authorize("admin"), mongoIdParam(), validateRequest, controller.remove);

export default router;
