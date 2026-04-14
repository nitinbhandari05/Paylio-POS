import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/categories.json"));

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeName = (value) => (value || "").trim().toLowerCase();

const Category = {
  list: async () => store.read(),

  findOne: async (query = {}) => {
    const categories = await store.read();

    if (query._id) {
      return categories.find((item) => item._id === String(query._id)) || null;
    }

    if (query.name) {
      const name = normalizeName(query.name);
      return categories.find((item) => normalizeName(item.name) === name) || null;
    }

    if (query.slug) {
      return categories.find((item) => item.slug === query.slug) || null;
    }

    return categories.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload) => {
    const categories = await store.read();
    const name = (payload.name || "").trim();

    if (!name) {
      throw new Error("Category name is required");
    }

    if (categories.some((item) => normalizeName(item.name) === normalizeName(name))) {
      throw new Error("Category already exists");
    }

    const now = new Date().toISOString();
    const category = {
      _id: randomUUID(),
      name,
      slug: payload.slug || slugify(name),
      description: payload.description || "",
      createdAt: now,
      updatedAt: now,
    };

    categories.push(category);
    await store.write(categories);

    return category;
  },

  update: async (id, payload) => {
    const categories = await store.read();
    const index = categories.findIndex((item) => item._id === String(id));

    if (index === -1) {
      return null;
    }

    const nextName = payload.name?.trim();
    if (nextName) {
      const duplicate = categories.find(
        (item, currentIndex) =>
          currentIndex !== index && normalizeName(item.name) === normalizeName(nextName)
      );

      if (duplicate) {
        throw new Error("Category already exists");
      }

      categories[index].name = nextName;
      categories[index].slug = payload.slug || slugify(nextName);
    }

    if (payload.description !== undefined) {
      categories[index].description = payload.description;
    }

    categories[index].updatedAt = new Date().toISOString();

    await store.write(categories);
    return categories[index];
  },

  remove: async (id) => {
    const categories = await store.read();
    const filtered = categories.filter((item) => item._id !== String(id));

    if (filtered.length === categories.length) {
      return false;
    }

    await store.write(filtered);
    return true;
  },
};

export default Category;
