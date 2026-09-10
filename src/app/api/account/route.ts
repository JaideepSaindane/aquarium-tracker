import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";

/**
 * Which sign-in methods the signed-in account already has linked —
 * src/app/(tabs)/settings/page.tsx uses this to decide whether to show the
 * "Add phone sign-in" card (only when a Google account has no phone linked
 * yet). See src/app/api/account/link-phone/route.ts for the linking flow.
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const row = (await serverDb.select().from(users).where(eq(users.id, userId)))[0];
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ hasPhone: !!row.phone, hasGoogle: !!row.googleId });
}
