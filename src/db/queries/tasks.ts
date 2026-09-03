import { eq, isNull, and } from "drizzle-orm";
import { db } from "../client";
import { tasks } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";
import { nextOccurrence } from "@/lib/recurrence";

export type NewTask = {
  tankId: string;
  livestockId?: string;
  title: string;
  presetType?: string;
  rrule?: string | null;
  nextDueAt: string;
};

export async function listTasksForTank(tankId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.tankId, tankId), isNull(tasks.deletedAt), eq(tasks.isActive, true)));
}

export async function listAllActiveTasks() {
  return db.select().from(tasks).where(and(isNull(tasks.deletedAt), eq(tasks.isActive, true)));
}

/** Every task regardless of active state — a completed one-off task goes inactive, but its lastDoneAt still counts toward the T-026 logging-retention metric. */
export async function listAllTasks() {
  return db.select().from(tasks).where(isNull(tasks.deletedAt));
}

export async function createTask(input: NewTask) {
  const now = nowIso();
  const id = newId();
  await db.insert(tasks).values({
    id,
    tankId: input.tankId,
    livestockId: input.livestockId,
    title: input.title,
    presetType: input.presetType,
    rrule: input.rrule ?? null,
    nextDueAt: input.nextDueAt,
    lastDoneAt: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  notifyChanged();
  return id;
}

/** Marks done and, if recurring, rolls forward to the next occurrence; one-off tasks are deactivated instead of deleted so history survives. */
export async function completeTask(id: string) {
  const task = (await db.select().from(tasks).where(eq(tasks.id, id)))[0];
  if (!task) return null;
  const now = nowIso();
  const next = nextOccurrence(now, task.rrule);
  await db
    .update(tasks)
    .set({ lastDoneAt: now, nextDueAt: next, isActive: next !== null, updatedAt: now })
    .where(eq(tasks.id, id));
  notifyChanged();
  return { nextDueAt: next };
}

export async function rescheduleTask(id: string, nextDueAt: string) {
  await db.update(tasks).set({ nextDueAt, updatedAt: nowIso() }).where(eq(tasks.id, id));
  notifyChanged();
}

export async function deleteTask(id: string) {
  await db.update(tasks).set({ deletedAt: nowIso(), isActive: false }).where(eq(tasks.id, id));
  notifyChanged();
}
