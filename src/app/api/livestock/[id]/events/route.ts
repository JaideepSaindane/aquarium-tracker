import { NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { livestockEvents } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rows = await serverDb
    .select()
    .from(livestockEvents)
    .where(and(eq(livestockEvents.livestockId, id), eq(livestockEvents.userId, userId)))
    .orderBy(asc(livestockEvents.occurredAt));
  return NextResponse.json(rows);
}
