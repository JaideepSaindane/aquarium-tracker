import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { dismissedWarnings } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// GET ?warningKey=X -> isWarningDismissed (returns { dismissed: boolean })
// GET ?all=1        -> every dismissed-warning row for this user (export)
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const warningKey = searchParams.get("warningKey");
  const all = searchParams.get("all") === "1";

  if (all) {
    const rows = await serverDb.select().from(dismissedWarnings).where(eq(dismissedWarnings.userId, userId));
    return NextResponse.json(rows);
  }
  if (!warningKey) return NextResponse.json({ error: "warningKey is required" }, { status: 400 });

  const rows = await serverDb
    .select()
    .from(dismissedWarnings)
    .where(and(eq(dismissedWarnings.userId, userId), eq(dismissedWarnings.warningKey, warningKey)));
  return NextResponse.json({ dismissed: rows.length > 0 });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  await serverDb.insert(dismissedWarnings).values({
    id: newId(),
    userId,
    tankId: input.tankId,
    livestockId: input.livestockId,
    warningKey: input.warningKey,
    dismissedAt: nowIso(),
  });
  return NextResponse.json({ ok: true });
}
