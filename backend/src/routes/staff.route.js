import express from "express";
import User from "../models/user.model.js";
import { requireHeadOffice } from "../middlewares/outlet.middleware.js";

const router = express.Router();

router.get("/", requireHeadOffice, async (req, res) => {
  const users = await User.list();
  const outletId = req.query.outletId ? String(req.query.outletId) : "";
  const filtered = outletId ? users.filter((user) => user.outletId === outletId) : users;
  res.json({ staff: filtered });
});

router.patch("/:id/assignment", requireHeadOffice, async (req, res) => {
  try {
    const updated = await User.update(req.params.id, {
      role: req.body.role,
      outletId: req.body.outletId,
      isHeadOffice: req.body.isHeadOffice,
      active: req.body.active,
      name: req.body.name,
    });

    if (!updated) {
      return res.status(404).json({ message: "Staff user not found" });
    }

    res.json({ message: "Staff assignment updated", staff: updated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
