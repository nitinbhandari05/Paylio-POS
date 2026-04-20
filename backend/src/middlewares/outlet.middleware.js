const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const resolveOutletContext = (req, _res, next) => {
  req.outletId =
    req.headers["x-outlet-id"] ||
    req.query.outletId ||
    req.body.outletId ||
    req.user?.outletId ||
    process.env.DEFAULT_OUTLET_ID ||
    "main";
  next();
};

export const requireRoles = (...roles) => {
  const allowed = roles.map((role) => normalizeRole(role));
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!allowed.includes(role)) {
      return res.status(403).json({ message: "Forbidden: role not allowed" });
    }
    next();
  };
};

export const requireHeadOffice = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  const isHeadOfficeRole = ["admin", "headoffice", "superadmin"].includes(role);
  const isHeadOfficeUser = Boolean(req.user?.isHeadOffice);

  if (!isHeadOfficeRole && !isHeadOfficeUser) {
    return res.status(403).json({ message: "Head office access required" });
  }
  next();
};
