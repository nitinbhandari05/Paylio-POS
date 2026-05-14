import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: env.nodeEnv !== "production",
      serverSelectionTimeoutMS: 3000,
    });
    logger.info("MongoDB connected", { database: mongoose.connection.name });
    return true;
  } catch (error) {
    logger.warn("MongoDB unavailable; continuing with local JSON data store", {
      error: error.message,
    });
    return false;
  }
};

export const closeDatabase = () => mongoose.connection.close();
