import { eq, isNull, and, desc } from "drizzle-orm";
import { db } from "../client";
import { logEntries } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type NewLogEntry = {
  tankId: string;
  type: "journal" | "maintenance" | "incident" | "treatment" | "water_change";
  body: string;
  occurredAt?: string;
  waterChangedPct?: number;
};

export async function addLogEntry(input: NewLogEntry) {
  const now = nowIso();
  const id = newId();
  await db.insert(logEntries).values({
    id,
    tankId: input.tankId,
    type: input.type,
    body: input.body,
    occurredAt: input.occurredAt ?? now,
    waterChangedPct: input.waterChangedPct,
    createdAt: now,
    updatedAt: now,
  });
  notifyChanged();
  return id;
}

export async function listLogEntriesForTank(tankId: string) {
  return db
    .select()
    .from(logEntries)
    .where(and(eq(logEntries.tankId, tankId), isNull(logEntries.deletedAt)))
    .orderBy(desc(logEntries.occurredAt));
}

/** Every log entry across every tank — used by the T-026 metrics screen. */
export async function listAllLogEntries() {
  return db.select().from(logEntries).where(isNull(logEntries.deletedAt));
}
