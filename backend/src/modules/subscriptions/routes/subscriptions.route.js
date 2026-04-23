import express from "express";
import { getSubscriptionsOverview } from "../controllers/subscriptions.controller.js";

const router = express.Router();

router.get("/", getSubscriptionsOverview);

export default router;
