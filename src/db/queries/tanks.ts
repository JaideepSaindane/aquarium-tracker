import { notifyChanged } from "../live";

// Rewritten 2026-09-10 to call the new user-scoped server API
// (src/app/api/tanks/*) instead of the local SQLite-WASM client, now that
// real accounts exist — see CLAUDE.md's updated Principle 5 and
// specs/PROGRESS.md's "accounts + backend" entry. Function names/shapes
// kept identical on purpose so every page that already imports these
// didn't need to change.

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

export type Tank = {
  id: string;
  name: string;
  photoUri: string | null;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeL: number;
  shape: string | null;
  status: string | null;
  waterType: string | null;
  isPlanted: boolean | null;
  hasCo2: boolean | null;
  setupType: string | null;
  city: string | null;
  startedOn: string | null;
  substrate: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listTanks(): Promise<Tank[]> {
  return json(await fetch("/api/tanks"));
}

export async function getTank(id: string): Promise<Tank | undefined> {
  const res = await fetch(`/api/tanks/${id}`);
  if (res.status === 404) return undefined;
  return json(res);
}

export async function createTank(input: NewTank): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/tanks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function updateTank(id: string, patch: TankUpdate): Promise<void> {
  await fetch(`/api/tanks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  notifyChanged();
}

export async function deleteTank(id: string): Promise<void> {
  await fetch(`/api/tanks/${id}`, { method: "DELETE" });
  notifyChanged();
}
