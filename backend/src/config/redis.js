import IORedis from "ioredis";
import { env, isTest } from "./env.js";
import { logger } from "../utils/logger.js";

let redisClient = null;

export const getRedis = () => {
  if (isTest || !env.redisUrl) return null;
  if (!redisClient) {
    redisClient = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    redisClient.on("error", (error) => logger.warn("Redis error", { error: error.message }));
  }
  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient) await redisClient.quit();
  redisClient = null;
};
