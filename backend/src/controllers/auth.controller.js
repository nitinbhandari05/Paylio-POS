import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  successResponse(res, user, "User registered", 201);
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  successResponse(res, data, "Login successful");
});

export const refreshToken = asyncHandler(async (req, res) => {
  const data = await authService.refresh(req.body.refreshToken);
  successResponse(res, data, "Token refreshed");
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id, req.body.refreshToken);
  successResponse(res, null, "Logout successful");
});

export const profile = asyncHandler(async (req, res) => successResponse(res, req.user, "Profile"));
