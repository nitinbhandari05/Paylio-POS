import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const auditStore = createArrayStore(resolve(__dirname, "../../data/audit-logs.json"));

export const audit = (action, moduleName = "general") => {
  return async (req, _res, next) => {
    try {
      const logs = await auditStore.read();
      logs.push({
        _id: randomUUID(),
        action,
        module: moduleName,
        actorUserId: req.user?.id || null,
        actorRole: req.user?.role || null,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || "",
        createdAt: new Date().toISOString(),
      });
      await auditStore.write(logs.slice(-5000));
    } catch {
      // Audit errors should never block the main request flow.
    }

    next();
  };
};
