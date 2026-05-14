import { authService } from "../services/auth.service.js";
import OtpToken from "../models/otp-token.model.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";

const normalizeTarget = (body = {}) => {
  const channel = String(body.channel || body.otpChannel || (body.phone ? "phone" : "email")).toLowerCase();
  const target = channel === "phone"
    ? String(body.phone || body.target || "").trim()
    : String(body.email || body.target || "").trim().toLowerCase();
  return { channel, target };
};

export const register = asyncHandler(async (req, res) => {
  if (req.body.otpCode) {
    const { channel, target } = normalizeTarget(req.body);
    await OtpToken.verify({
      purpose: "register",
      channel,
      target,
      code: req.body.otpCode,
    });
  }
  const user = await authService.register(req.body);
  successResponse(res, user, "User registered", 201);
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  successResponse(res, data, "Login successful");
});

export const loginWithPin = asyncHandler(async (req, res) => {
  const data = await authService.loginWithPin(req.body);
  successResponse(res, data, "PIN login successful");
});

export const requestRegisterOtp = asyncHandler(async (req, res) => {
  const { channel, target } = normalizeTarget(req.body);
  const otp = await OtpToken.request({ purpose: "register", channel, target });
  successResponse(res, { debugOtp: otp.code }, "OTP sent");
});

export const requestForgotPasswordOtp = asyncHandler(async (req, res) => {
  const { channel, target } = normalizeTarget(req.body);
  const user = await User.findOne(channel === "phone" ? { phone: target } : { email: target });
  if (!user) throw new AppError("User not found", 404);
  const otp = await OtpToken.request({ purpose: "forgot_password", channel, target });
  successResponse(res, { debugOtp: otp.code }, "OTP sent");
});

export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { channel, target } = normalizeTarget(req.body);
  await OtpToken.verify({
    purpose: "forgot_password",
    channel,
    target,
    code: req.body.otpCode,
  });
  const user = await User.findOne(channel === "phone" ? { phone: target } : { email: target });
  if (!user) throw new AppError("User not found", 404);
  user.password = req.body.newPassword;
  await user.save();
  successResponse(res, null, "Password reset successful");
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
