import express from "express";
import { getFranchiseOverview } from "../controllers/franchise.controller.js";

const router = express.Router();

router.get("/", getFranchiseOverview);

export default router;
