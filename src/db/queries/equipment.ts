import { notifyChanged } from "../live";

// Rewritten 2026-09-11 to call the new user-scoped server API
// (src/app/api/equipment/*) — see tanks.ts's header comment for the
// original pattern this follows.

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

export type EquipmentRow = {
  id: string;
  tankId: string;
  type: string;
  subtype: string | null;
  brand: string | null;
  model: string | null;
  wattage: number | null;
  ratedLph: number | null;
  installedOn: string | null;
  serviceIntervalDays: number | null;
  lastServicedOn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listEquipmentForTank(tankId: string): Promise<EquipmentRow[]> {
  return json(await fetch(`/api/equipment?tankId=${encodeURIComponent(tankId)}`));
}

export async function addEquipment(input: NewEquipment): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/equipment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function removeEquipment(id: string): Promise<void> {
  await fetch(`/api/equipment/${id}`, { method: "DELETE" });
  notifyChanged();
}
