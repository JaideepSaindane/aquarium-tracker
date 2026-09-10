import { notifyChanged } from "../live";

// Rewritten 2026-09-10 to call the new user-scoped server API
// (src/app/api/measurements) — see tanks.ts's header comment for why.

export type NewMeasurement = {
  tankId: string;
  parameterId: string;
  value: number;
  measuredAt?: string;
  method?: string;
  note?: string;
};

export type MeasurementRow = {
  id: string;
  tankId: string;
  parameterId: string;
  value: number;
  measuredAt: string;
  method: string | null;
  note: string | null;
  photoUri: string | null;
  createdAt: string;
  deletedAt: string | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listMeasurementsForTank(tankId: string): Promise<MeasurementRow[]> {
  return json(await fetch(`/api/measurements?tankId=${encodeURIComponent(tankId)}`));
}

export async function listAllMeasurements(): Promise<MeasurementRow[]> {
  return json(await fetch(`/api/measurements?all=1`));
}

export async function listMeasurementsForParam(tankId: string, parameterId: string): Promise<MeasurementRow[]> {
  return json(await fetch(`/api/measurements?tankId=${encodeURIComponent(tankId)}&parameterId=${encodeURIComponent(parameterId)}`));
}

export async function getLastMeasurement(tankId: string, parameterId: string): Promise<MeasurementRow | undefined> {
  const rows = await listMeasurementsForParam(tankId, parameterId);
  return rows[0];
}

export async function addMeasurement(input: NewMeasurement): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/measurements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function countMeasurementsForTank(tankId: string, parameterId: string): Promise<number> {
  const rows = await listMeasurementsForParam(tankId, parameterId);
  return rows.length;
}
