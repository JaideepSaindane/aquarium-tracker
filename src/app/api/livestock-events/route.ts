import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { livestockEvents } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";

// Every livestock event across every tank for this account — used by the
// full-export flow (src/lib/export.ts) to include the per-fish timeline,
// which the existing /api/livestock/[id]/events route can't do in one call.
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await serverDb.select().from(livestockEvents).where(eq(livestockEvents.userId, userId));
  return NextResponse.json(rows);
}
