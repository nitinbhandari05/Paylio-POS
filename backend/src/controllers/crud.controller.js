import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";

export const makeCrudController = (Model, label) => ({
  create: asyncHandler(async (req, res) => successResponse(res, await Model.create(req.body), `${label} created`, 201)),
  list: asyncHandler(async (_req, res) => successResponse(res, await Model.find().sort("-createdAt"), `${label}s`)),
  get: asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw new AppError(`${label} not found`, 404);
    successResponse(res, doc, label);
  }),
  update: asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) throw new AppError(`${label} not found`, 404);
    successResponse(res, doc, `${label} updated`);
  }),
  remove: asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw new AppError(`${label} not found`, 404);
    successResponse(res, null, `${label} deleted`);
  }),
});
