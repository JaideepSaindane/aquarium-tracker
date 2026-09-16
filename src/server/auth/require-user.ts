import { auth } from "@/auth";
import { getViewAsUserId } from "./view-as";

/**
 * Every user-scoped API route needs this first — returns the signed-in
 * user's id, or null if somehow called without a session (middleware should
 * already have redirected, this is belt-and-suspenders).
 *
 * While an admin is in read-only "view as user" mode
 * (src/server/auth/view-as.ts) this returns the VIEWED account's id, so every
 * screen renders their data. Writes can't reach here: src/proxy.ts rejects
 * every non-GET request while that cookie is set.
 */
export async function requireUserId(): Promise<string | null> {
  const viewAs = await getViewAsUserId();
  if (viewAs) return viewAs;
  const session = await auth();
  return session?.user?.id ?? null;
}
