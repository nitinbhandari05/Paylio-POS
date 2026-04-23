import express from "express";
import { getReportsOverview } from "../controllers/reports.controller.js";

const router = express.Router();

router.get("/", getReportsOverview);

export default router;
