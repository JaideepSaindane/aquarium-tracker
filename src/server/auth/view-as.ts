import { cookies } from "next/headers";
import { getRedis } from "@/server/ai/redis";

// Admin "view as user", read-only (Jaideep, 2026-09-16, for QA: "I want to
// log into his actual account… keep it read only. No actions should be
// enabled.").
//
// A real session as that user for READS only: `requireUserId()` returns the
// viewed account's id, so every screen renders exactly what they see, while
// src/proxy.ts rejects every non-GET request for the duration. The token
// lives in Redis so it expires on its own and can be revoked, and it is only
// ever issued to a valid admin-dashboard session.
export const VIEW_AS_COOKIE = "admin_view_as";
const TTL_SECONDS = 30 * 60;

function key(token: string): string {
  return `admin-view-as:${token}`;
}

/** Issues a read-only view-as token for `userId`. Caller must already be an authenticated admin. */
export async function createViewAsToken(userId: string, adminId: string): Promise<string> {
  const token = crypto.randomUUID();
  await getRedis().set(key(token), JSON.stringify({ userId, adminId, at: new Date().toISOString() }), { ex: TTL_SECONDS });
  // Audit trail: shows up in the server logs with who viewed whom, when.
  console.warn(`[view-as] admin ${adminId} started read-only view of user ${userId}`);
  return token;
}

/** The user id being viewed, or null. Read by requireUserId() and the banner. */
export async function getViewAsUserId(): Promise<string | null> {
  const token = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!token) return null;
  const raw = await getRedis().get<string | Record<string, unknown>>(key(token));
  if (!raw) return null;
  const data = typeof raw === "string" ? (JSON.parse(raw) as { userId?: string }) : (raw as { userId?: string });
  return data.userId ?? null;
}

export async function clearViewAs(): Promise<void> {
  const store = await cookies();
  const token = store.get(VIEW_AS_COOKIE)?.value;
  if (token) await getRedis().del(key(token));
}
