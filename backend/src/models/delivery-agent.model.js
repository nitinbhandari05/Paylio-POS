import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/delivery-agents.json"));
const DEFAULT_OUTLET_ID = process.env.DEFAULT_OUTLET_ID || "main";

const normalizeOutlet = (value) => String(value || DEFAULT_OUTLET_ID);

const DeliveryAgent = {
  list: async (query = {}) => {
    const agents = await store.read();
    const outletId = query.outletId ? normalizeOutlet(query.outletId) : "";
    return agents.filter((agent) => (outletId ? agent.outletId === outletId : true));
  },

  findOne: async (query = {}) => {
    const agents = await store.read();

    if (query._id) {
      return agents.find((item) => item._id === String(query._id)) || null;
    }

    return agents.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new Error("Delivery agent name is required");
    }

    const now = new Date().toISOString();
    const agent = {
      _id: randomUUID(),
      outletId: normalizeOutlet(payload.outletId),
      name,
      phone: payload.phone || "",
      vehicleType: payload.vehicleType || "bike",
      vehicleNumber: payload.vehicleNumber || "",
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      createdAt: now,
      updatedAt: now,
    };

    const agents = await store.read();
    agents.push(agent);
    await store.write(agents);
    return agent;
  },

  update: async (id, payload = {}) => {
    const agents = await store.read();
    const index = agents.findIndex((item) => item._id === String(id));
    if (index === -1) {
      return null;
    }

    if (payload.name !== undefined) agents[index].name = String(payload.name || "").trim();
    if (payload.phone !== undefined) agents[index].phone = payload.phone || "";
    if (payload.vehicleType !== undefined) agents[index].vehicleType = payload.vehicleType || "bike";
    if (payload.vehicleNumber !== undefined) agents[index].vehicleNumber = payload.vehicleNumber || "";
    if (payload.active !== undefined) agents[index].active = Boolean(payload.active);
    agents[index].updatedAt = new Date().toISOString();

    await store.write(agents);
    return agents[index];
  },
};

export default DeliveryAgent;
