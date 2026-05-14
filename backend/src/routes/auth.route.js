import { Router } from "express";
import { login, logout, profile, refreshToken, register } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/error.middleware.js";
import { loginValidator, registerValidator } from "../validators/auth.validator.js";

const router = Router();

router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginValidator, validateRequest, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);
router.get("/profile", protect, profile);

export default router;
