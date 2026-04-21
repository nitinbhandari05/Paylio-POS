import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/organizations.json"));

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || "org-main";

const normalize = (value) => String(value || "").trim().toLowerCase();

const toSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "organization";

const ensureDefaultOrganization = async () => {
  const organizations = await store.read();
  if (organizations.length) {
    return organizations;
  }

  const now = new Date().toISOString();
  const seeded = [
    {
      _id: DEFAULT_ORG_ID,
      name: "Paylio Demo Hospitality Pvt Ltd",
      slug: "paylio-demo",
      gstin: "",
      ownerEmail: "owner@paylio.demo",
      timezone: process.env.TZ || "Asia/Kolkata",
      currency: "INR",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  await store.write(seeded);
  return seeded;
};

const Organization = {
  DEFAULT_ORG_ID,

  list: async () => ensureDefaultOrganization(),

  findOne: async (query = {}) => {
    const organizations = await ensureDefaultOrganization();

    if (query._id) {
      return organizations.find((item) => item._id === String(query._id)) || null;
    }

    if (query.slug) {
      return organizations.find((item) => normalize(item.slug) === normalize(query.slug)) || null;
    }

    return organizations.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const organizations = await ensureDefaultOrganization();
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new Error("Organization name is required");
    }

    const slug = toSlug(payload.slug || payload.name);
    if (organizations.some((org) => normalize(org.slug) === normalize(slug))) {
      throw new Error("Organization slug already exists");
    }

    const now = new Date().toISOString();
    const organization = {
      _id: payload._id || randomUUID(),
      name,
      slug,
      gstin: String(payload.gstin || "").trim().toUpperCase(),
      ownerEmail: String(payload.ownerEmail || "").trim().toLowerCase(),
      timezone: payload.timezone || "Asia/Kolkata",
      currency: payload.currency || "INR",
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      createdAt: now,
      updatedAt: now,
    };

    organizations.push(organization);
    await store.write(organizations);
    return organization;
  },

  update: async (id, payload = {}) => {
    const organizations = await ensureDefaultOrganization();
    const index = organizations.findIndex((item) => item._id === String(id));
    if (index === -1) {
      return null;
    }

    if (payload.name !== undefined) organizations[index].name = String(payload.name || "").trim();
    if (payload.slug !== undefined) organizations[index].slug = toSlug(payload.slug);
    if (payload.gstin !== undefined) organizations[index].gstin = String(payload.gstin || "").trim().toUpperCase();
    if (payload.ownerEmail !== undefined) organizations[index].ownerEmail = String(payload.ownerEmail || "").trim().toLowerCase();
    if (payload.timezone !== undefined) organizations[index].timezone = payload.timezone;
    if (payload.currency !== undefined) organizations[index].currency = payload.currency;
    if (payload.active !== undefined) organizations[index].active = Boolean(payload.active);
    organizations[index].updatedAt = new Date().toISOString();

    await store.write(organizations);
    return organizations[index];
  },
};

export default Organization;
