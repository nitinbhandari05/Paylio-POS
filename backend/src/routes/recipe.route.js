import express from "express";
import Recipe from "../models/recipe.model.js";

const router = express.Router();

const resolveOutletId = (req) =>
  req.headers["x-outlet-id"] || req.query.outletId || req.body.outletId || req.user?.outletId || "main";

router.get("/", async (req, res) => {
  try {
    const recipes = await Recipe.list({
      outletId: resolveOutletId(req),
      productId: req.query.productId,
    });
    res.json({ recipes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const recipe = await Recipe.upsert({
      outletId: resolveOutletId(req),
      productId: req.body.productId,
      ingredients: req.body.ingredients,
      wastagePercent: req.body.wastagePercent,
    });
    res.status(201).json({ message: "Recipe saved", recipe });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;

