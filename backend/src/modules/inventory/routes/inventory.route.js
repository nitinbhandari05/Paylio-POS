import express from "express";
import { getInventoryOverview } from "../controllers/inventory.controller.js";

const router = express.Router();

router.get("/", getInventoryOverview);

export default router;
