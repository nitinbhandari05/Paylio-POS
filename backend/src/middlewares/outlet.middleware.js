const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const resolveOutletContext = (req, _res, next) => {
  const requestedOutletId =
    req.headers["x-outlet-id"] ||
    req.query.outletId ||
    req.body.outletId ||
    req.user?.outletId ||
    process.env.DEFAULT_OUTLET_ID ||
    "main";
  const isPrivilegedUser =
    Boolean(req.user?.isHeadOffice) ||
    ["admin", "owner", "headoffice", "superadmin"].includes(
      normalizeRole(req.user?.role)
    );
  const allowedOutlets = Array.isArray(req.user?.accessibleOutletIds)
    ? req.user.accessibleOutletIds
    : [req.user?.outletId || requestedOutletId];

  if (!isPrivilegedUser && allowedOutlets.length && !allowedOutlets.includes(requestedOutletId)) {
    return _res.status(403).json({ message: "Forbidden: outlet access denied" });
  }

  req.outletId = requestedOutletId;
  next();
};

export const requireRoles = (...roles) => {
  return (_req, _res, next) => next();
};

export const requireHeadOffice = (req, res, next) => {
  next();
};
