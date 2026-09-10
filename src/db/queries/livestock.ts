import { notifyChanged } from "../live";

// Rewritten 2026-09-10 to call the new user-scoped server API
// (src/app/api/livestock/*) — see tanks.ts's header comment for why.

export type NewLivestock = {
  tankId: string;
  speciesId: string;
  count: number;
  nickname?: string;
  addedOn?: string;
  status?: string;
};

export type LivestockRow = {
  id: string;
  tankId: string;
  speciesId: string;
  nickname: string | null;
  count: number;
  addedOn: string;
  removedOn: string | null;
  status: string | null;
  deathCause: string | null;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LivestockEvent = {
  id: string;
  livestockId: string;
  type: string;
  occurredAt: string;
  note: string | null;
  photoUri: string | null;
  createdAt: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listLivestockForTank(tankId: string): Promise<LivestockRow[]> {
  return json(await fetch(`/api/livestock?tankId=${encodeURIComponent(tankId)}`));
}

export async function listPlannedLivestockForTank(tankId: string): Promise<LivestockRow[]> {
  return json(await fetch(`/api/livestock?tankId=${encodeURIComponent(tankId)}&planned=1`));
}

export async function listAllAliveLivestock(): Promise<LivestockRow[]> {
  return json(await fetch(`/api/livestock?alive=1`));
}

export async function listAllLivestock(): Promise<LivestockRow[]> {
  return json(await fetch(`/api/livestock?all=1`));
}

export async function addLivestock(input: NewLivestock): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/livestock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function listLivestockEvents(livestockId: string): Promise<LivestockEvent[]> {
  return json(await fetch(`/api/livestock/${livestockId}/events`));
}

async function patchLivestock(id: string, body: Record<string, unknown>): Promise<void> {
  await fetch(`/api/livestock/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  notifyChanged();
}

export async function markLivestockArrived(id: string): Promise<void> {
  await patchLivestock(id, { action: "arrive" });
}

export async function updateLivestockCount(id: string, count: number): Promise<void> {
  await patchLivestock(id, { action: "updateCount", count });
}

export async function removeLivestock(id: string): Promise<void> {
  await patchLivestock(id, { action: "remove" });
}

export async function recordDeath(id: string, cause?: string): Promise<void> {
  await patchLivestock(id, { action: "death", cause });
}
