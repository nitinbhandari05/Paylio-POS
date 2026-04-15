import express from "express";
import {
  createMovement,
  getMovements,
  getSummary
} from "../controllers/inventory.controller.js";

const router = express.Router();

router.post("/", createMovement);
router.get("/", getMovements);
router.get("/summary", getSummary);

export default router;