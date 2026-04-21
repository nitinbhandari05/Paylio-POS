import express from "express";
import { register, login, loginWithPin } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/pin-login", loginWithPin);

export default router;
