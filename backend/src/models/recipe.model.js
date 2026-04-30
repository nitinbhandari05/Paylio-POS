import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/recipes.json"));
const DEFAULT_OUTLET_ID = process.env.DEFAULT_OUTLET_ID || "main";

const normalizeOutlet = (outletId) => String(outletId || DEFAULT_OUTLET_ID);

const Recipe = {
  list: async ({ outletId, productId } = {}) => {
    const rows = await store.read();
    return rows.filter((row) => {
      if (outletId && row.outletId !== normalizeOutlet(outletId)) return false;
      if (productId && row.productId !== String(productId)) return false;
      return true;
    });
  },

  findOne: async ({ outletId, productId, _id } = {}) => {
    const rows = await store.read();
    if (_id) return rows.find((row) => row._id === String(_id)) || null;
    if (outletId && productId) {
      return (
        rows.find(
          (row) =>
            row.outletId === normalizeOutlet(outletId) &&
            row.productId === String(productId)
        ) || null
      );
    }
    return null;
  },

  upsert: async ({ outletId, productId, ingredients = [], wastagePercent = 0 }) => {
    const rows = await store.read();
    const outlet = normalizeOutlet(outletId);
    const pid = String(productId || "");
    if (!pid) throw new Error("productId is required");

    const normalizedIngredients = ingredients
      .map((item) => ({
        itemId: String(item.itemId || ""),
        quantity: Number(item.quantity || 0),
        unit: String(item.unit || "unit"),
      }))
      .filter((item) => item.itemId && item.quantity > 0);

    const now = new Date().toISOString();
    const index = rows.findIndex((row) => row.outletId === outlet && row.productId === pid);

    if (index === -1) {
      const recipe = {
        _id: randomUUID(),
        outletId: outlet,
        productId: pid,
        ingredients: normalizedIngredients,
        wastagePercent: Math.max(0, Number(wastagePercent || 0)),
        createdAt: now,
        updatedAt: now,
      };
      rows.push(recipe);
      await store.write(rows);
      return recipe;
    }

    rows[index] = {
      ...rows[index],
      ingredients: normalizedIngredients,
      wastagePercent: Math.max(0, Number(wastagePercent || 0)),
      updatedAt: now,
    };
    await store.write(rows);
    return rows[index];
  },
};

export default Recipe;

