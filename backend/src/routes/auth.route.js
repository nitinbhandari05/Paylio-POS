import express from "express";
import {
  register,
  login,
  loginWithPin,
  requestRegisterOtp,
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register/request-otp", requestRegisterOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/pin-login", loginWithPin);
router.post("/forgot-password/request-otp", requestForgotPasswordOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);

export default router;
