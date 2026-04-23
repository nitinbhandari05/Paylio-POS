import express from "express";
import { getStaffOverview } from "../controllers/staff.controller.js";

const router = express.Router();

router.get("/", getStaffOverview);

export default router;
