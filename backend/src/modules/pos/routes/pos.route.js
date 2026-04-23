import express from "express";
import { getPosOverview } from "../controllers/pos.controller.js";

const router = express.Router();

router.get("/", getPosOverview);

export default router;
