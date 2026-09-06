import { eq, isNull, and } from "drizzle-orm";
import { db } from "../client";
import { livestock, livestockEvents } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type NewLivestock = {
  tankId: string;
  speciesId: string;
  count: number;
  nickname?: string;
  addedOn?: string;
  /** Defaults to 'alive'. 'planned' marks a fish the user WANTS (T-027 guided planner) — it must never count as living in the tank. */
  status?: string;
};

export async function listLivestockForTank(tankId: string) {
  return db
    .select()
    .from(livestock)
    .where(and(eq(livestock.tankId, tankId), isNull(livestock.deletedAt)));
}

/** Livestock the user WANTS but doesn't have yet (T-027 guided planner) — shown separately in the Fish tab, never counted as living in the tank. */
export async function listPlannedLivestockForTank(tankId: string) {
  return db
    .select()
    .from(livestock)
    .where(and(eq(livestock.tankId, tankId), eq(livestock.status, "planned"), isNull(livestock.deletedAt)));
}

/** All alive livestock rows across every tank — used by the My Tanks list to show a "N× Species" badge row per tank without a per-tank query loop. */
export async function listAllAliveLivestock() {
  return db
    .select()
    .from(livestock)
    .where(and(eq(livestock.status, "alive"), isNull(livestock.deletedAt)));
}

/** Every livestock row regardless of status — used by the T-026 90-day survival metric, which needs the died/rehomed rows too. */
export async function listAllLivestock() {
  return db.select().from(livestock).where(isNull(livestock.deletedAt));
}

export async function addLivestock(input: NewLivestock) {
  const now = nowIso();
  const id = newId();
  await db.insert(livestock).values({
    id,
    tankId: input.tankId,
    speciesId: input.speciesId,
    count: input.count,
    nickname: input.nickname,
    addedOn: input.addedOn ?? now,
    status: input.status ?? "alive",
    createdAt: now,
    updatedAt: now,
  });
  // Starting point for the per-livestock timeline (specs/T-022). A
  // 'planned' row gets a 'planned' event instead — it hasn't been added
  // to any real tank yet, and the timeline should say so.
  await db.insert(livestockEvents).values({
    id: newId(),
    livestockId: id,
    type: input.status === "planned" ? "planned" : "added",
    occurredAt: input.addedOn ?? now,
    createdAt: now,
  });
  notifyChanged();
  return id;
}

export async function listLivestockEvents(livestockId: string) {
  return db.select().from(livestockEvents).where(eq(livestockEvents.livestockId, livestockId)).orderBy(livestockEvents.occurredAt);
}

/**
 * Marks a planned fish (T-027) as actually living in the tank — the day
 * the real fish comes home. Writes a real "added" event so the timeline
 * records the true arrival, not the planning date.
 */
export async function markLivestockArrived(id: string) {
  const now = nowIso();
  await db.update(livestock).set({ status: "alive", addedOn: now, updatedAt: now }).where(eq(livestock.id, id));
  await db.insert(livestockEvents).values({
    id: newId(),
    livestockId: id,
    type: "added",
    occurredAt: now,
    createdAt: now,
  });
  notifyChanged();
}

export async function updateLivestockCount(id: string, count: number) {
  await db.update(livestock).set({ count, updatedAt: nowIso() }).where(eq(livestock.id, id));
  notifyChanged();
}

/** Free and always available, with no payment prompt — Aquareka lost a star for gating this. */
export async function removeLivestock(id: string) {
  await db.update(livestock).set({ deletedAt: nowIso() }).where(eq(livestock.id, id));
  notifyChanged();
}

/**
 * Records a death kindly — optional cause, never a scorecard (Principle 06).
 * Feeds the 90-day survival metric (T-026), which is why status/deathCause
 * live on the row rather than being inferred from deletedAt.
 */
export async function recordDeath(id: string, cause?: string) {
  const now = nowIso();
  await db.update(livestock).set({ status: "died", deathCause: cause, removedOn: now, updatedAt: now }).where(eq(livestock.id, id));
  await db.insert(livestockEvents).values({
    id: newId(),
    livestockId: id,
    type: "died",
    occurredAt: now,
    note: cause,
    createdAt: now,
  });
  notifyChanged();
}
