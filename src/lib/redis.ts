import Redis from "ioredis";

const getRedisUrl = (): string => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  // Railway provides REDIS_URL automatically when Redis is attached
  throw new Error("REDIS_URL environment variable is not set");
};

// Create a singleton Redis connection for the application
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Create a separate connection for BullMQ (it needs its own connection)
export const createRedisConnection = (): Redis => {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

export default redis;
