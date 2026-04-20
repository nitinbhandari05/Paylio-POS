import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/branches.json"));

const normalize = (value) => String(value || "").trim().toLowerCase();

const Branch = {
  list: async () => store.read(),

  findOne: async (query = {}) => {
    const branches = await store.read();

    if (query._id) {
      return branches.find((item) => item._id === String(query._id)) || null;
    }

    if (query.code) {
      return branches.find((item) => normalize(item.code) === normalize(query.code)) || null;
    }

    return branches.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const branches = await store.read();
    const name = String(payload.name || "").trim();
    const code = String(payload.code || "").trim().toUpperCase();

    if (!name) {
      throw new Error("Branch name is required");
    }
    if (!code) {
      throw new Error("Branch code is required");
    }

    if (branches.some((item) => normalize(item.code) === normalize(code))) {
      throw new Error("Branch code already exists");
    }

    const now = new Date().toISOString();
    const branch = {
      _id: randomUUID(),
      name,
      code,
      address: payload.address || "",
      phone: payload.phone || "",
      email: payload.email || "",
      managerName: payload.managerName || "",
      isHeadOffice: Boolean(payload.isHeadOffice),
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      createdAt: now,
      updatedAt: now,
    };

    branches.push(branch);
    await store.write(branches);
    return branch;
  },

  update: async (id, payload = {}) => {
    const branches = await store.read();
    const index = branches.findIndex((item) => item._id === String(id));
    if (index === -1) {
      return null;
    }

    if (payload.name !== undefined) {
      const name = String(payload.name).trim();
      if (!name) {
        throw new Error("Branch name is required");
      }
      branches[index].name = name;
    }

    if (payload.code !== undefined) {
      const code = String(payload.code).trim().toUpperCase();
      if (!code) {
        throw new Error("Branch code is required");
      }
      const duplicate = branches.find(
        (item, itemIndex) =>
          itemIndex !== index && normalize(item.code) === normalize(code)
      );
      if (duplicate) {
        throw new Error("Branch code already exists");
      }
      branches[index].code = code;
    }

    if (payload.address !== undefined) branches[index].address = payload.address;
    if (payload.phone !== undefined) branches[index].phone = payload.phone;
    if (payload.email !== undefined) branches[index].email = payload.email;
    if (payload.managerName !== undefined) branches[index].managerName = payload.managerName;
    if (payload.isHeadOffice !== undefined) branches[index].isHeadOffice = Boolean(payload.isHeadOffice);
    if (payload.active !== undefined) branches[index].active = Boolean(payload.active);

    branches[index].updatedAt = new Date().toISOString();
    await store.write(branches);
    return branches[index];
  },
};

export default Branch;
