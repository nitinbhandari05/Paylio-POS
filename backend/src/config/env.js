import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config({ path: resolve(__dirname, "../../.env") });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const productionMode = nodeEnv === "production";

const required = (value, name) => {
  if (productionMode && !String(value || "").trim()) {
    throw new Error(`${name} is required in production`);
  }
  return value;
};

const toArray = (value) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

// Read allowed frontend origins
const corsOriginsRaw =
  process.env.CORS_ORIGINS ||
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  process.env.FRONTEND_ORIGIN ||
  process.env.APP_URL ||
  "";

// During development allow localhost.
// During production, if nothing is provided, allow all temporarily.
let corsOrigins =
  corsOriginsRaw.length > 0
    ? toArray(corsOriginsRaw)
    : productionMode
    ? ["*"]
    : ["http://localhost:5173"];

if (productionMode && corsOrigins.includes("*")) {
  console.warn(
    "WARNING: No CLIENT_URL/CORS_ORIGINS configured. Allowing all origins."
  );
}

export const env = {
  nodeEnv,

  port: Number(process.env.PORT || 3001),

  host: productionMode ? "0.0.0.0" : "127.0.0.1",

  mongoUri:
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/smart-pos",

  redisUrl: process.env.REDIS_URL || "",

  jwtSecret: required(
    process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET,
    "JWT_SECRET"
  ),

  jwtRefreshSecret: required(
    process.env.JWT_REFRESH_SECRET ||
      process.env.REFRESH_TOKEN_SECRET,
    "JWT_REFRESH_SECRET"
  ),

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ||
    process.env.ACCESS_TOKEN_EXPIRY ||
    "15m",

  jwtRefreshExpiresIn:
    process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  corsOrigins,

  corsAllowAnyOrigin: corsOrigins.includes("*"),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },

  mail: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from:
      process.env.MAIL_FROM ||
      "Smart POS <no-reply@smart-pos.local>",
  },
};

export const isProduction = productionMode;
export const isTest = nodeEnv === "test";