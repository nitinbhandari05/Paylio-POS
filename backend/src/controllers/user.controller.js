import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  successResponse(res, user, "User created", 201);
});
export const listUsers = asyncHandler(async (_req, res) => successResponse(res, await User.find().select("-refreshTokens"), "Users"));
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-refreshTokens");
  if (!user) throw new AppError("User not found", 404);
  successResponse(res, user, "User");
});
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select("-refreshTokens");
  if (!user) throw new AppError("User not found", 404);
  successResponse(res, user, "User updated");
});
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  successResponse(res, null, "User deleted");
});
export const setUserActive = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
  if (!user) throw new AppError("User not found", 404);
  successResponse(res, user, "User status updated");
});
