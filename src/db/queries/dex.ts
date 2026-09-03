import { eq } from "drizzle-orm";
import { db } from "../client";
import { dexCards } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export async function listDexCards() {
  return db.select().from(dexCards);
}

export async function getDexCard(speciesId: string) {
  const rows = await db.select().from(dexCards).where(eq(dexCards.speciesId, speciesId));
  return rows[0];
}

/**
 * Unlock triggers: adding a species to a tank, or (in principle) a scan
 * detecting it — though Tank Scan no longer identifies livestock, so in
 * practice this only fires from the livestock-add flow today (specs/T-021).
 * Idempotent: a species already unlocked just gets `timesKept` bumped and
 * keeps its original `unlockedAt`/`unlockSource` — never re-triggers the
 * unlock animation.
 */
export async function unlockDexCard(input: {
  speciesId: string;
  unlockSource: "added_to_tank" | "scan_detected" | "community";
  firstPhotoUri?: string;
}): Promise<{ isNewUnlock: boolean }> {
  const existing = await getDexCard(input.speciesId);
  const now = nowIso();

  if (existing) {
    await db
      .update(dexCards)
      .set({ timesKept: (existing.timesKept ?? 1) + 1 })
      .where(eq(dexCards.speciesId, input.speciesId));
    notifyChanged();
    return { isNewUnlock: false };
  }

  await db.insert(dexCards).values({
    id: newId(),
    speciesId: input.speciesId,
    unlockedAt: now,
    unlockSource: input.unlockSource,
    timesKept: 1,
    firstPhotoUri: input.firstPhotoUri,
    createdAt: now,
  });
  notifyChanged();
  return { isNewUnlock: true };
}
