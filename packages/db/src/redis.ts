import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Separate client for pub/sub (cannot be used for other commands while subscribed)
export function createRedisClient() {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

export const redis = createRedisClient();
