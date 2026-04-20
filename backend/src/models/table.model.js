import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/tables.json"));

const DEFAULT_OUTLET_ID = process.env.DEFAULT_OUTLET_ID || "main";
const ALLOWED_STATUSES = ["free", "occupied", "reserved", "cleaning"];

const normalizeOutlet = (value) => String(value || DEFAULT_OUTLET_ID);
const normalizeStatus = (value) => String(value || "free").trim().toLowerCase();

const Table = {
  list: async (query = {}) => {
    const tables = await store.read();
    const outletId = query.outletId ? normalizeOutlet(query.outletId) : "";
    return tables
      .filter((table) => (outletId ? table.outletId === outletId : true))
      .sort((a, b) => Number(a.number) - Number(b.number));
  },

  findOne: async (query = {}) => {
    const tables = await store.read();

    if (query._id) {
      return tables.find((item) => item._id === String(query._id)) || null;
    }

    if (query.number !== undefined) {
      const number = Number(query.number);
      const outletId = normalizeOutlet(query.outletId);
      return (
        tables.find(
          (item) => Number(item.number) === number && item.outletId === outletId
        ) || null
      );
    }

    return tables.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const tables = await store.read();
    const outletId = normalizeOutlet(payload.outletId);
    const number = Number(payload.number);
    const seats = Number(payload.seats || 2);

    if (!Number.isFinite(number) || number <= 0) {
      throw new Error("Valid table number is required");
    }

    if (!Number.isFinite(seats) || seats <= 0) {
      throw new Error("Valid seats value is required");
    }

    const duplicate = tables.find(
      (item) => Number(item.number) === number && item.outletId === outletId
    );
    if (duplicate) {
      throw new Error("Table number already exists for this outlet");
    }

    const now = new Date().toISOString();
    const table = {
      _id: randomUUID(),
      outletId,
      number,
      seats,
      status: "free",
      label: payload.label || `Table ${number}`,
      qrSlug: payload.qrSlug || `${outletId}-table-${number}`,
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      notes: payload.notes || "",
      createdAt: now,
      updatedAt: now,
    };

    tables.push(table);
    await store.write(tables);
    return table;
  },

  update: async (id, payload = {}) => {
    const tables = await store.read();
    const index = tables.findIndex((item) => item._id === String(id));
    if (index === -1) {
      return null;
    }

    if (payload.seats !== undefined) {
      const seats = Number(payload.seats);
      if (!Number.isFinite(seats) || seats <= 0) {
        throw new Error("Valid seats value is required");
      }
      tables[index].seats = seats;
    }

    if (payload.label !== undefined) tables[index].label = payload.label || tables[index].label;
    if (payload.notes !== undefined) tables[index].notes = payload.notes || "";
    if (payload.active !== undefined) tables[index].active = Boolean(payload.active);

    if (payload.status !== undefined) {
      const status = normalizeStatus(payload.status);
      if (!ALLOWED_STATUSES.includes(status)) {
        throw new Error("Invalid table status");
      }
      tables[index].status = status;
    }

    tables[index].updatedAt = new Date().toISOString();
    await store.write(tables);
    return tables[index];
  },
};

export default Table;
