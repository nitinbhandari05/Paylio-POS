import express from "express";
import PromoCode from "../models/promo-code.model.js";
import { requireRoles } from "../middlewares/outlet.middleware.js";

const router = express.Router();

router.use(requireRoles("manager", "admin", "superadmin", "headoffice"));

router.get("/", async (_req, res) => {
  const promos = await PromoCode.list();
  res.json({ promos });
});

router.post("/", async (req, res) => {
  try {
    const promo = await PromoCode.create(req.body);
    res.status(201).json({ message: "Promo code created", promo });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
