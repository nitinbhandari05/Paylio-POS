import express from "express";
import { getAiOverview } from "../controllers/ai.controller.js";

const router = express.Router();

router.get("/", getAiOverview);

export default router;
