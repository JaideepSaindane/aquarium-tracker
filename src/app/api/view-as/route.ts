import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getViewAsUserId } from "@/server/auth/view-as";

/** Who (if anyone) is being viewed read-only — drives the app-wide banner. */
export async function GET() {
  const userId = await getViewAsUserId();
  if (!userId) return NextResponse.json({ viewing: null });
  const u = (await serverDb.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, userId)))[0];
  return NextResponse.json({ viewing: { userId, label: u?.name || u?.email || u?.phone || userId.slice(0, 8) } });
}
