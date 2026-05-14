import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== "production",
  });
  logger.info("MongoDB connected", { database: mongoose.connection.name });
};

export const closeDatabase = () => mongoose.connection.close();
