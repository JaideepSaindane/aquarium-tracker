import { eq, isNull, and } from "drizzle-orm";
import { db } from "../client";
import { tanks } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type NewTank = {
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  shape?: string;
  waterType?: string;
  city?: string;
  isPlanted?: boolean;
  hasCo2?: boolean;
  startedOn?: string;
  substrate?: string;
  status?: string;
  setupType?: string;
  photoUri?: string;
};

export type TankUpdate = Partial<NewTank> & { notes?: string };

export async function listTanks() {
  return db.select().from(tanks).where(isNull(tanks.deletedAt));
}

export async function getTank(id: string) {
  const rows = await db
    .select()
    .from(tanks)
    .where(and(eq(tanks.id, id), isNull(tanks.deletedAt)));
  return rows[0];
}

export async function createTank(input: NewTank) {
  const now = nowIso();
  const volumeL = Math.round(((input.lengthCm * input.widthCm * input.heightCm) / 1000) * 10) / 10;
  const id = newId();
  await db.insert(tanks).values({
    id,
    name: input.name,
    lengthCm: input.lengthCm,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    volumeL,
    shape: input.shape,
    waterType: input.waterType ?? "fresh",
    city: input.city,
    isPlanted: input.isPlanted ?? false,
    hasCo2: input.hasCo2 ?? false,
    startedOn: input.startedOn,
    substrate: input.substrate,
    status: input.status ?? "active",
    setupType: input.setupType,
    photoUri: input.photoUri,
    createdAt: now,
    updatedAt: now,
  });
  notifyChanged();
  return id;
}

export async function updateTank(id: string, patch: TankUpdate) {
  const now = nowIso();
  const values: Record<string, unknown> = { ...patch, updatedAt: now };
  if (patch.lengthCm && patch.widthCm && patch.heightCm) {
    values.volumeL = Math.round(((patch.lengthCm * patch.widthCm * patch.heightCm) / 1000) * 10) / 10;
  }
  await db.update(tanks).set(values).where(eq(tanks.id, id));
  notifyChanged();
}

export async function deleteTank(id: string) {
  await db.update(tanks).set({ deletedAt: nowIso() }).where(eq(tanks.id, id));
  notifyChanged();
}
