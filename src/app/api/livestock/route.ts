import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { livestock, livestockEvents } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// GET modes, chosen by which query params are present (mirrors the old
// local query file's several list functions — one endpoint, filtered):
//   ?tankId=X            -> listLivestockForTank
//   ?tankId=X&planned=1  -> listPlannedLivestockForTank
//   ?all=1               -> listAllLivestock
//   ?alive=1             -> listAllAliveLivestock
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tankId = searchParams.get("tankId");
  const planned = searchParams.get("planned") === "1";
  const all = searchParams.get("all") === "1";
  const alive = searchParams.get("alive") === "1";

  const conditions = [eq(livestock.userId, userId)];
  if (tankId) conditions.push(eq(livestock.tankId, tankId));
  if (planned) conditions.push(eq(livestock.status, "planned"));
  if (alive) conditions.push(eq(livestock.status, "alive"));
  if (!all) conditions.push(isNull(livestock.deletedAt));

  const rows = await serverDb.select().from(livestock).where(and(...conditions));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const id = newId();
  await serverDb.insert(livestock).values({
    id,
    userId,
    tankId: input.tankId,
    speciesId: input.speciesId,
    count: input.count,
    nickname: input.nickname,
    addedOn: input.addedOn ?? now,
    status: input.status ?? "alive",
    createdAt: now,
    updatedAt: now,
  });
  await serverDb.insert(livestockEvents).values({
    id: newId(),
    userId,
    livestockId: id,
    type: input.status === "planned" ? "planned" : "added",
    occurredAt: input.addedOn ?? now,
    createdAt: now,
  });
  return NextResponse.json({ id });
}
