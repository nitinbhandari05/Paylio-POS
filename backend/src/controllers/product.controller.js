import { productService } from "../services/product.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";

export const createProduct = asyncHandler(async (req, res) =>
  successResponse(res, await productService.create(req.body, req.files, req.user?._id), "Product created", 201)
);
export const listProducts = asyncHandler(async (req, res) => {
  const data = await productService.list(req.query);
  successResponse(res, data.items, "Products", 200, data.meta);
});
export const getProduct = asyncHandler(async (req, res) => successResponse(res, await productService.getById(req.params.id), "Product"));
export const updateProduct = asyncHandler(async (req, res) =>
  successResponse(res, await productService.update(req.params.id, req.body, req.files), "Product updated")
);
export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.remove(req.params.id);
  successResponse(res, null, "Product deleted");
});
export const lowStockProducts = asyncHandler(async (_req, res) =>
  successResponse(res, await productService.lowStock(), "Low stock products")
);
