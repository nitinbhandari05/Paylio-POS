import express from "express";
import { getSupportOverview } from "../controllers/support.controller.js";

const router = express.Router();

router.get("/", getSupportOverview);

export default router;
