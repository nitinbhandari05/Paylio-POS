import express from "express";
import { getBrandsOverview } from "../controllers/brands.controller.js";

const router = express.Router();

router.get("/", getBrandsOverview);

export default router;
