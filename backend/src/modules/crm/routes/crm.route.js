import express from "express";
import { getCrmOverview } from "../controllers/crm.controller.js";

const router = express.Router();

router.get("/", getCrmOverview);

export default router;
