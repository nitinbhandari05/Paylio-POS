import express from "express";
import { getAuthOverview } from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/", getAuthOverview);

export default router;
