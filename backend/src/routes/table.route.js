import express from "express";
import Table from "../models/table.model.js";
import { requireRoles, resolveOutletContext } from "../middlewares/outlet.middleware.js";

const router = express.Router();

const buildTableQrUrl = (req, table) => {
  const baseUrl = process.env.WEB_ORDER_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/order/table/${table.number}?outletId=${encodeURIComponent(table.outletId)}`;
};

router.use(resolveOutletContext);
router.use(requireRoles("cashier", "waiter", "manager", "admin", "superadmin", "headoffice"));

router.get("/", async (req, res) => {
  const tables = await Table.list({ outletId: req.outletId });
  res.json({ outletId: req.outletId, tables });
});

router.post("/", async (req, res) => {
  try {
    const table = await Table.create({
      ...req.body,
      outletId: req.outletId,
    });
    res.status(201).json({ message: "Table created", table, qrUrl: buildTableQrUrl(req, table) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const table = await Table.update(req.params.id, req.body);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    res.json({ message: "Table updated", table });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const table = await Table.update(req.params.id, { status: req.body.status });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    res.json({ message: "Table status updated", table });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/:id/qr", async (req, res) => {
  const table = await Table.findOne({ _id: req.params.id });
  if (!table) {
    return res.status(404).json({ message: "Table not found" });
  }
  res.json({
    tableId: table._id,
    tableNumber: table.number,
    outletId: table.outletId,
    qrUrl: buildTableQrUrl(req, table),
  });
});

export default router;
