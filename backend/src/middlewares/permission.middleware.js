export const requirePermission = (...permissions) => {
  return (_req, _res, next) => next();
};
