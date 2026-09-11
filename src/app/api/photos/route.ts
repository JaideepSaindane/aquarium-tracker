import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { photos } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// GET modes (mirrors the old local query file's two list functions):
//   ?tankId=X       -> listPhotosForTank
//   ?logEntryId=X   -> listPhotosForLogEntry
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tankId = searchParams.get("tankId");
  const logEntryId = searchParams.get("logEntryId");

  const conditions = [eq(photos.userId, userId), isNull(photos.deletedAt)];
  if (tankId) conditions.push(eq(photos.tankId, tankId));
  if (logEntryId) conditions.push(eq(photos.logEntryId, logEntryId));

  const rows = await serverDb.select().from(photos).where(and(...conditions));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const id = newId();
  await serverDb.insert(photos).values({
    id,
    userId,
    tankId: input.tankId,
    livestockId: input.livestockId,
    logEntryId: input.logEntryId,
    scanId: input.scanId,
    localUri: input.localUri,
    caption: input.caption,
    takenAt: input.takenAt ?? now,
    width: input.width,
    height: input.height,
    bytes: input.bytes,
    createdAt: now,
  });
  return NextResponse.json({ id });
}
