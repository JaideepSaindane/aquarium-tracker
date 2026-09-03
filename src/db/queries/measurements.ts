import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../client";
import { measurements } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type NewMeasurement = {
  tankId: string;
  parameterId: string;
  value: number;
  measuredAt?: string;
  method?: string;
  note?: string;
};

export async function listMeasurementsForTank(tankId: string) {
  return db
    .select()
    .from(measurements)
    .where(and(eq(measurements.tankId, tankId), isNull(measurements.deletedAt)));
}

/** Every measurement across every tank — used by the T-026 metrics screen. */
export async function listAllMeasurements() {
  return db.select().from(measurements).where(isNull(measurements.deletedAt));
}

export async function listMeasurementsForParam(tankId: string, parameterId: string) {
  return db
    .select()
    .from(measurements)
    .where(and(eq(measurements.tankId, tankId), eq(measurements.parameterId, parameterId), isNull(measurements.deletedAt)))
    .orderBy(desc(measurements.measuredAt));
}

/** Most recent reading for this parameter — shown as a hint while entering the next one. */
export async function getLastMeasurement(tankId: string, parameterId: string) {
  const rows = await listMeasurementsForParam(tankId, parameterId);
  return rows[0];
}

export async function addMeasurement(input: NewMeasurement) {
  const now = nowIso();
  const id = newId();
  await db.insert(measurements).values({
    id,
    tankId: input.tankId,
    parameterId: input.parameterId,
    value: input.value,
    measuredAt: input.measuredAt ?? now,
    method: input.method ?? "liquid_kit",
    note: input.note,
    createdAt: now,
  });
  notifyChanged();
  return id;
}

export async function countMeasurementsForTank(tankId: string, parameterId: string) {
  const rows = await db
    .select()
    .from(measurements)
    .where(and(eq(measurements.tankId, tankId), eq(measurements.parameterId, parameterId)));
  return rows.length;
}
