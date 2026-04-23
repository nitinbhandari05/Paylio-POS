import express from "express";
import { getOutletsOverview } from "../controllers/outlets.controller.js";

const router = express.Router();

router.get("/", getOutletsOverview);

export default router;
