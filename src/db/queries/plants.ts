import { notifyChanged } from "../live";

// Rewritten 2026-09-11 to call the new user-scoped server API
// (src/app/api/plants/*) — see tanks.ts's header comment for the original
// pattern this follows.

export type NewPlant = {
  tankId: string;
  speciesId?: string;
  commonName: string;
  quantity?: number;
  lightNeed?: string;
  co2Need?: string;
  plantedOn?: string;
};

export type PlantRow = {
  id: string;
  tankId: string;
  speciesId: string | null;
  commonName: string | null;
  plantedOn: string | null;
  quantity: number | null;
  lightNeed: string | null;
  co2Need: string | null;
  trimIntervalDays: number | null;
  lastTrimmedOn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listPlantsForTank(tankId: string): Promise<PlantRow[]> {
  return json(await fetch(`/api/plants?tankId=${encodeURIComponent(tankId)}`));
}

export async function addPlant(input: NewPlant): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/plants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function removePlant(id: string): Promise<void> {
  await fetch(`/api/plants/${id}`, { method: "DELETE" });
  notifyChanged();
}
