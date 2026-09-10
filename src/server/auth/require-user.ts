import { auth } from "@/auth";

/** Every user-scoped API route needs this first — returns the signed-in user's id, or null if somehow called without a session (middleware should already have redirected, this is belt-and-suspenders). */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
