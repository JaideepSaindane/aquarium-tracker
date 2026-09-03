import { eq, isNull, and, desc } from "drizzle-orm";
import { db } from "../client";
import { photos } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type NewPhoto = {
  tankId?: string;
  livestockId?: string;
  logEntryId?: string;
  scanId?: string;
  localUri: string;
  caption?: string;
  takenAt?: string;
  width?: number;
  height?: number;
  bytes?: number;
};

export async function addPhoto(input: NewPhoto) {
  const now = nowIso();
  const id = newId();
  await db.insert(photos).values({
    id,
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
  notifyChanged();
  return id;
}

/** Chronological, for the tank's photo gallery (specs/T-022) — most recent first. */
export async function listPhotosForTank(tankId: string) {
  return db
    .select()
    .from(photos)
    .where(and(eq(photos.tankId, tankId), isNull(photos.deletedAt)))
    .orderBy(desc(photos.takenAt));
}

export async function listPhotosForLogEntry(logEntryId: string) {
  return db
    .select()
    .from(photos)
    .where(and(eq(photos.logEntryId, logEntryId), isNull(photos.deletedAt)));
}
