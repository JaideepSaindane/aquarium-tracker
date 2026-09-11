import { NextResponse } from "next/server";
import { and, eq, isNull, desc } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { logEntries } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// GET modes (mirrors the old local query file):
//   ?tankId=X   -> listLogEntriesForTank (most recent first)
//   ?all=1      -> listAllLogEntries (T-026 metrics screen)
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tankId = searchParams.get("tankId");
  const all = searchParams.get("all") === "1";

  const conditions = [eq(logEntries.userId, userId), isNull(logEntries.deletedAt)];
  if (tankId) conditions.push(eq(logEntries.tankId, tankId));

  const rows = all
    ? await serverDb.select().from(logEntries).where(and(...conditions))
    : await serverDb.select().from(logEntries).where(and(...conditions)).orderBy(desc(logEntries.occurredAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const id = newId();
  await serverDb.insert(logEntries).values({
    id,
    userId,
    tankId: input.tankId,
    type: input.type,
    body: input.body,
    occurredAt: input.occurredAt ?? now,
    waterChangedPct: input.waterChangedPct,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id });
}
