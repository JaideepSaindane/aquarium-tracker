import { createHash } from "node:crypto";
import { getRedis } from "./redis";

// Caching by prompt hash — specs/T-013: "common compatibility questions
// should cost once." 30-day TTL: long enough that repeat questions are
// free, short enough that a prompt-version bump naturally invalidates
// (the hash includes prompt_version, so a version bump is a cache miss
// automatically — no manual invalidation needed).
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

export function hashPrompt(promptVersion: string, promptText: string): string {
  return createHash("sha256").update(`${promptVersion}\n${promptText}`).digest("hex");
}

export async function getCached<T>(hash: string): Promise<T | null> {
  const redis = getRedis();
  return (await redis.get<T>(`cache:${hash}`)) ?? null;
}

export async function setCached<T>(hash: string, value: T): Promise<void> {
  const redis = getRedis();
  await redis.set(`cache:${hash}`, value, { ex: CACHE_TTL_SECONDS });
}
