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
 * Unlock triggers: adding a species to a tank, a manual "Save to My Fish"
 * tap on the species detail page (2026-09-14 — Jaideep: "folks need not
 * add these to tanks"), or (in principle) a scan detecting it — though Tank
 * Scan no longer identifies livestock, so `scan_detected` doesn't fire in
 * practice today. Idempotent: a species already unlocked just gets
 * `timesKept` bumped and keeps its original `unlockedAt`/`unlockSource` —
 * never re-triggers the unlock animation.
 */
export async function unlockDexCard(input: {
  speciesId: string;
  unlockSource: "added_to_tank" | "scan_detected" | "community" | "saved_manually";
  firstPhotoUri?: string;
}): Promise<{ isNewUnlock: boolean }> {
  const result = await json<{ isNewUnlock: boolean }>(
    await fetch("/api/dex-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return result;
}

/**
 * Un-saves a species from My Fish (2026-09-14, Jaideep: "there should be an
 * option to save to my fish... folks need not add these to tanks"). Purely
 * a "my collection" marker removal — never touches tanks/livestock, so it's
 * safe even for a species that's also kept in a real tank (the UI guards
 * against that case instead, see dex/[id]/page.tsx).
 */
export async function removeDexCard(speciesId: string): Promise<void> {
  await fetch(`/api/dex-cards?speciesId=${encodeURIComponent(speciesId)}`, { method: "DELETE" });
  notifyChanged();
}
