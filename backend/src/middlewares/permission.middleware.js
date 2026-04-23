import { hasPermission, normalizeRole } from "../config/rbac.config.js";

export const requirePermission = (...permissions) => {
  const required = permissions.filter(Boolean);

  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    const missing = required.filter((permission) => !hasPermission(role, permission));

    if (missing.length) {
      return res.status(403).json({
        message: "Forbidden: missing required permission",
        role,
        required,
        missing,
      });
    }

    next();
  };
};
