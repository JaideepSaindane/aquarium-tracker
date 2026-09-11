import { getRedis } from "./redis";

// specs/T-025-free-tier-and-pro.md's real numbers: 2 scans and 15 questions
// per calendar month, per anonymous device id, on the free tier once Pro
// actually exists to sell. /triage, /compat, /species-gen and /species-id
// are never metered (see the route files) — this module is only imported
// by /scan and /ask.
export const SPEC_QUOTA_LIMITS: Record<"scan" | "ask", number> = {
  scan: 2,
  ask: 15,
};

// EARLY BIRD MODE (2026-09-02 decision, specs/PROGRESS.md): Stripe/Pro
// isn't built yet, and Jaideep chose to run everything free for now rather
// than half-build a paywall with nothing to actually buy. Metering stays
// wired up (so real numbers are a one-line flip back to SPEC_QUOTA_LIMITS
// once Pro ships) but the effective ceiling is high enough nobody
// realistically hits it. Flip EARLY_BIRD_MODE off, or delete it, when Pro
// launches — see the decisions log for the exact date this was set.
export const EARLY_BIRD_MODE = true;
const EARLY_BIRD_LIMITS: Record<"scan" | "ask", number> = { scan: 100000, ask: 100000 };

export const QUOTA_LIMITS: Record<"scan" | "ask", number> = EARLY_BIRD_MODE ? EARLY_BIRD_LIMITS : SPEC_QUOTA_LIMITS;

function currentMonthKey(userId: string, kind: "scan" | "ask"): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `quota:${userId}:${kind}:${month}`;
}

function secondsUntilNextMonthUtc(): number {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
}

export type QuotaCheck =
  | { allowed: true; used: number; limit: number }
  | { allowed: false; used: number; limit: number; resetsAt: string };

/** Checks quota WITHOUT incrementing — use before doing the (expensive) AI call. `userId` is the real signed-in account id (see src/server/auth/require-user.ts), not a client-reported device id — see the 2026-09-11 fix in specs/PROGRESS.md for why this matters. */
export async function peekQuota(userId: string, kind: "scan" | "ask"): Promise<QuotaCheck> {
  const redis = getRedis();
  const key = currentMonthKey(userId, kind);
  const used = (await redis.get<number>(key)) ?? 0;
  const limit = QUOTA_LIMITS[kind];
  if (used >= limit) {
    const resetsAt = new Date(Date.now() + secondsUntilNextMonthUtc() * 1000).toISOString();
    return { allowed: false, used, limit, resetsAt };
  }
  return { allowed: true, used, limit };
}

/** Call only after the AI call actually succeeds — a failed call shouldn't burn quota. `userId` is the real signed-in account id, same as peekQuota above. */
export async function incrementQuota(userId: string, kind: "scan" | "ask"): Promise<void> {
  const redis = getRedis();
  const key = currentMonthKey(userId, kind);
  const newValue = await redis.incr(key);
  if (newValue === 1) {
    await redis.expire(key, secondsUntilNextMonthUtc());
  }
}
