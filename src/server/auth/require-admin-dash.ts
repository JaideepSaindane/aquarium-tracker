import { cookies } from "next/headers";
import { getRedis } from "@/server/ai/redis";

// The admin dashboard's own separate login (2026-09-15, Jaideep: "get the
// admin page... with an ID and password") — deliberately independent of
// the regular AquaAI account system (Google/phone+PIN via src/auth.ts).
// A signed-in session here is a random opaque token stored in Redis with
// a TTL, referenced by an httpOnly cookie — not a JWT, so it can actually
// be revoked (logout deletes the Redis key), unlike the app's own
// stateless NextAuth sessions.
export const ADMIN_DASH_COOKIE = "admin_dash_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function sessionKey(token: string): string {
  return `admin-dash-session:${token}`;
}

export async function createAdminDashSession(): Promise<string> {
  const token = crypto.randomUUID();
  await getRedis().set(sessionKey(token), "1", { ex: SESSION_TTL_SECONDS });
  return token;
}

export async function destroyAdminDashSession(token: string): Promise<void> {
  await getRedis().del(sessionKey(token));
}

/** True if the request carries a valid, unexpired admin-dashboard session cookie. */
export async function requireAdminDashSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_DASH_COOKIE)?.value;
  if (!token) return false;
  const valid = await getRedis().get<string>(sessionKey(token));
  return valid === "1";
}
