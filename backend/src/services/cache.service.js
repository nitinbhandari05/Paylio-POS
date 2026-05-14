import { getRedis } from "../config/redis.js";

export const cacheService = {
  async get(key) {
    const redis = getRedis();
    if (!redis) return null;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },
  async set(key, value, ttl = 300) {
    const redis = getRedis();
    if (!redis) return value;
    await redis.set(key, JSON.stringify(value), "EX", ttl);
    return value;
  },
  async del(pattern) {
    const redis = getRedis();
    if (!redis) return;
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(keys);
  },
  key(prefix, params = {}) {
    return `${prefix}:${JSON.stringify(params)}`;
  },
};
