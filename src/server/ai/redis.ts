import { Redis } from "@upstash/redis";

// Vercel's Upstash integration names these KV_REST_API_* (the old "Vercel
// KV" branding), not the SDK's own default UPSTASH_REDIS_REST_* names —
// Redis.fromEnv() would look for the wrong vars, so construct explicitly.
let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) {
      throw new Error("KV_REST_API_URL/KV_REST_API_TOKEN are not set — Upstash Redis is not configured.");
    }
    client = new Redis({ url, token });
  }
  return client;
}
