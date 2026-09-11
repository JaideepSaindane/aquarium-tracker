import { notifyChanged } from "../live";

// Rewritten 2026-09-11 to call the new user-scoped server API
// (src/app/api/dex-cards/*) — see tanks.ts's header comment for the
// original pattern this follows.

export type DexCardRow = {
  id: string;
  speciesId: string;
  unlockedAt: string | null;
  unlockSource: string | null;
  timesKept: number | null;
  firstPhotoUri: string | null;
  createdAt: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listDexCards(): Promise<DexCardRow[]> {
  return json(await fetch("/api/dex-cards"));
}

export async function getDexCard(speciesId: string): Promise<DexCardRow | undefined> {
  const rows = await json<DexCardRow[]>(await fetch(`/api/dex-cards?speciesId=${encodeURIComponent(speciesId)}`));
  return rows[0];
}

/**
 * Unlock triggers: adding a species to a tank, or (in principle) a scan
 * detecting it — though Tank Scan no longer identifies livestock, so in
 * practice this only fires from the livestock-add flow today (specs/T-021).
 * Idempotent: a species already unlocked just gets `timesKept` bumped and
 * keeps its original `unlockedAt`/`unlockSource` — never re-triggers the
 * unlock animation.
 */
export async function unlockDexCard(input: {
  speciesId: string;
  unlockSource: "added_to_tank" | "scan_detected" | "community";
  firstPhotoUri?: string;
}): Promise<{ isNewUnlock: boolean }> {
  const result = await json<{ isNewUnlock: boolean }>(
    await fetch("/api/dex-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return result;
}
