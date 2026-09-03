import { eq, isNull, and } from "drizzle-orm";
import { db } from "../client";
import { equipment } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type NewEquipment = {
  tankId: string;
  type: string; // filter | heater | light | co2 | air_pump | chiller | other
  subtype?: string;
  brand?: string;
  model?: string;
  wattage?: number;
  ratedLph?: number;
  installedOn?: string;
};

export async function listEquipmentForTank(tankId: string) {
  return db
    .select()
    .from(equipment)
    .where(and(eq(equipment.tankId, tankId), isNull(equipment.deletedAt)));
}

export async function addEquipment(input: NewEquipment) {
  const now = nowIso();
  const id = newId();
  await db.insert(equipment).values({
    id,
    tankId: input.tankId,
    type: input.type,
    subtype: input.subtype,
    brand: input.brand,
    model: input.model,
    wattage: input.wattage,
    ratedLph: input.ratedLph,
    installedOn: input.installedOn ?? now,
    createdAt: now,
    updatedAt: now,
  });
  notifyChanged();
  return id;
}

export async function removeEquipment(id: string) {
  await db.update(equipment).set({ deletedAt: nowIso() }).where(eq(equipment.id, id));
  notifyChanged();
}
