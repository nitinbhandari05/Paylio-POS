import { Router } from "express";
import Customer from "../models/Customer.js";
import { makeCrudController } from "../controllers/crud.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/error.middleware.js";
import { mongoIdParam } from "../validators/common.validator.js";

const router = Router();
const controller = makeCrudController(Customer, "Customer");

router.use(protect);
router.route("/").post(controller.create).get(controller.list);
router.route("/:id").get(mongoIdParam(), validateRequest, controller.get).patch(mongoIdParam(), validateRequest, controller.update).delete(mongoIdParam(), validateRequest, controller.remove);

export default router;
