import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
});

const sanitizeObject = (value) => {
  if (!value || typeof value !== "object") return value;
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }
    sanitizeObject(value[key]);
  }
  return value;
};

export const mongoSanitizeMiddleware = (req, _res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  next();
};

export const securityMiddleware = [helmet(), mongoSanitizeMiddleware];

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
