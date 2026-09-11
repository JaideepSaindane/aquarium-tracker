import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { dexCards } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const speciesId = searchParams.get("speciesId");

  const conditions = [eq(dexCards.userId, userId)];
  if (speciesId) conditions.push(eq(dexCards.speciesId, speciesId));
  const rows = await serverDb.select().from(dexCards).where(and(...conditions));
  return NextResponse.json(rows);
}

// Unlock is upsert-by-(userId, speciesId), idempotent — a species already
// unlocked just gets timesKept bumped, mirroring the old local
// unlockDexCard()'s behaviour exactly.
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();

  const existing = (
    await serverDb.select().from(dexCards).where(and(eq(dexCards.userId, userId), eq(dexCards.speciesId, input.speciesId)))
  )[0];

  if (existing) {
    await serverDb
      .update(dexCards)
      .set({ timesKept: (existing.timesKept ?? 1) + 1 })
      .where(eq(dexCards.id, existing.id));
    return NextResponse.json({ isNewUnlock: false });
  }

  await serverDb.insert(dexCards).values({
    id: newId(),
    userId,
    speciesId: input.speciesId,
    unlockedAt: now,
    unlockSource: input.unlockSource,
    timesKept: 1,
    firstPhotoUri: input.firstPhotoUri,
    createdAt: now,
  });
  return NextResponse.json({ isNewUnlock: true });
}
