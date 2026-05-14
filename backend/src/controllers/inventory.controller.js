import { inventoryService } from "../services/inventory.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";

export const addStock = asyncHandler(async (req, res) =>
  successResponse(res, await inventoryService.adjust({ ...req.body, operationType: "ADD", userId: req.user._id }), "Stock added", 201)
);
export const removeStock = asyncHandler(async (req, res) =>
  successResponse(res, await inventoryService.adjust({ ...req.body, operationType: "REMOVE", userId: req.user._id }), "Stock removed", 201)
);
export const inventoryHistory = asyncHandler(async (req, res) =>
  successResponse(res, await inventoryService.history(req.params.productId), "Inventory history")
);
