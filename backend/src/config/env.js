import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config({ path: resolve(__dirname, "../../.env") });

const toArray = (value, fallback = []) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) || fallback;

const nodeEnv = process.env.NODE_ENV || "development";
const productionMode = nodeEnv === "production";
const requiredInProduction = (value, name) => {
  if (productionMode && !String(value || "").trim()) {
    throw new Error(`${name} is required in production`);
  }
  return value;
};

const corsOriginsRaw = process.env.CORS_ORIGINS || process.env.CLIENT_URL;
const corsOrigins = corsOriginsRaw ? toArray(corsOriginsRaw) : (productionMode ? [] : ["*"]);
if (productionMode && corsOrigins.length === 0) {
  throw new Error("CORS_ORIGINS or CLIENT_URL is required in production");
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 3001),
  host: productionMode ? process.env.HOST || "0.0.0.0" : "127.0.0.1",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart-pos",
  redisUrl: process.env.REDIS_URL || "",
  jwtSecret: requiredInProduction(process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET, "JWT_SECRET"),
  jwtRefreshSecret:
    requiredInProduction(
      process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET,
      "JWT_REFRESH_SECRET"
    ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRY || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  corsOrigins,
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
    from: process.env.MAIL_FROM || "Smart POS <no-reply@smart-pos.local>",
  },
};

export const isProduction = env.nodeEnv === "production";
export const isTest = env.nodeEnv === "test";
