import { eq, isNull, and } from "drizzle-orm";
import { db } from "../client";
import { plants } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type NewPlant = {
  tankId: string;
  speciesId?: string;
  commonName: string;
  quantity?: number;
  lightNeed?: string;
  co2Need?: string;
  plantedOn?: string;
};

export async function listPlantsForTank(tankId: string) {
  return db
    .select()
    .from(plants)
    .where(and(eq(plants.tankId, tankId), isNull(plants.deletedAt)));
}

export async function addPlant(input: NewPlant) {
  const now = nowIso();
  const id = newId();
  await db.insert(plants).values({
    id,
    tankId: input.tankId,
    speciesId: input.speciesId,
    commonName: input.commonName,
    quantity: input.quantity ?? 1,
    lightNeed: input.lightNeed,
    co2Need: input.co2Need,
    plantedOn: input.plantedOn ?? now,
    createdAt: now,
    updatedAt: now,
  });
  notifyChanged();
  return id;
}

export async function removePlant(id: string) {
  await db.update(plants).set({ deletedAt: nowIso() }).where(eq(plants.id, id));
  notifyChanged();
}
