import { Router } from "express";
import Category from "../models/category.model.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
const controller = {
  create: asyncHandler(async (req, res) => {
    successResponse(res, await Category.create(req.body), "Category created", 201);
  }),
  list: asyncHandler(async (_req, res) => {
    const categories = await Category.list();
    categories.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    successResponse(res, categories, "Categories");
  }),
  get: asyncHandler(async (req, res) => {
    const category = await Category.findOne({ _id: req.params.id });
    if (!category) throw new AppError("Category not found", 404);
    successResponse(res, category, "Category");
  }),
  update: asyncHandler(async (req, res) => {
    const category = await Category.update(req.params.id, req.body);
    if (!category) throw new AppError("Category not found", 404);
    successResponse(res, category, "Category updated");
  }),
  remove: asyncHandler(async (req, res) => {
    const removed = await Category.remove(req.params.id);
    if (!removed) throw new AppError("Category not found", 404);
    successResponse(res, null, "Category deleted");
  }),
};

router.route("/").post(protect, authorize("admin", "manager"), controller.create).get(protect, controller.list);
router.route("/:id")
  .get(protect, controller.get)
  .patch(protect, authorize("admin", "manager"), controller.update)
  .delete(protect, authorize("admin"), controller.remove);

export default router;
