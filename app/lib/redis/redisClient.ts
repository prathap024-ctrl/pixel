import { Redis } from "@upstash/redis";

// Publisher and subscriber for Pub/Sub
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
