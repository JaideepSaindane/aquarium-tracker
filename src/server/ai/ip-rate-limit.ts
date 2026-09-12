import type { NextRequest } from "next/server";
import { getRedis } from "./redis";

// 2026-09-12 security review finding: /compat, /species-gen, /planner,
// /triage, /species-id and /community/translate are each individually,
// deliberately unmetered (Principle 02 — never paywall safety/knowledge
// info) — but phone+PIN sign-up has no SMS verification, so an attacker
// can script unlimited free accounts and hit these six Gemini-backed
// routes without limit, bypassing the account-keyed quota system entirely
// (that system was never meant to be the only defense here). This adds a
// second, independent layer keyed by IP address rather than account, so
// scripted abuse from one source is capped regardless of how many
// throwaway accounts it rotates through. Deliberately loose (not a per-
// account free-tier limit) — it exists to stop scripted abuse, not to
// annoy a real person behind a shared/NAT'd IP making a few requests.
const WINDOW_SECONDS = 600; // 10 minutes
const MAX_PER_WINDOW = 20; // ~2/minute sustained from one IP across all six routes combined

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for on every request; NextRequest has no built-in
  // .ip in the App Router. Take the first hop (the real client, not a proxy
  // Vercel itself adds) — falls back to "unknown" only in local dev, where
  // there's no proxy setting this header at all.
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export type IpRateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Call once per request on the six unmetered AI routes, BEFORE the AI
 * call. Fails open (allows the request) if Redis is unreachable — a rate
 * limiter that takes the whole app down when Redis hiccups would be a
 * worse outcome than occasionally missing a rate-limit window.
 */
export async function checkIpRateLimit(req: NextRequest): Promise<IpRateLimitResult> {
  try {
    const redis = getRedis();
    const ip = clientIp(req);
    const key = `iprate:ai:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    if (count > MAX_PER_WINDOW) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : WINDOW_SECONDS };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
