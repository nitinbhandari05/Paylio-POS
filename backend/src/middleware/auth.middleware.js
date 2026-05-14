import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new AppError("Authentication token required", 401);

  const decoded = jwt.verify(token, env.jwtSecret);
  const user = await User.findOne({ _id: decoded.id });
  if (!user || user.active === false || user.isActive === false) {
    throw new AppError("User is inactive or not found", 401);
  }
  const { password, pin, refreshTokens, ...safeUser } = user;
  req.user = safeUser;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to perform this action", 403));
  }
  next();
};
