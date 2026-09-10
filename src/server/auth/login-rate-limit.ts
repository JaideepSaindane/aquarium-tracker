import { getRedis } from "@/server/ai/redis";

// A self-chosen 4-digit PIN is only a 10,000-combination keyspace and,
// unlike the phone-OTP flow this replaces (Jaideep's explicit call — no
// SMS provider cost), the phone number itself is never verified either.
// Rate-limiting failed attempts is the one guardrail that's still ours to
// add: lock a phone number out for 15 minutes after 5 wrong PINs in a row.
// Reuses the same Redis INCR/EXPIRE shape as src/server/ai/quota.ts.
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;

function key(phone: string): string {
  return `login-attempts:${phone}`;
}

export async function isLockedOut(phone: string): Promise<boolean> {
  const redis = getRedis();
  const attempts = (await redis.get<number>(key(phone))) ?? 0;
  return attempts >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(phone: string): Promise<void> {
  const redis = getRedis();
  const k = key(phone);
  const attempts = await redis.incr(k);
  if (attempts === 1) {
    await redis.expire(k, LOCKOUT_SECONDS);
  }
}

export async function clearAttempts(phone: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key(phone));
}
