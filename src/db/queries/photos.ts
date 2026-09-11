import { notifyChanged } from "../live";

// Rewritten 2026-09-11 to call the new user-scoped server API
// (src/app/api/photos/*) — see tanks.ts's header comment for the original
// pattern this follows. `localUri` now holds a real https Vercel Blob URL
// (see src/lib/photo-upload.ts), not an OPFS-relative path — the field
// name is kept for continuity with every existing call site.

export type NewPhoto = {
  tankId?: string;
  livestockId?: string;
  logEntryId?: string;
  scanId?: string;
  localUri: string;
  caption?: string;
  takenAt?: string;
  width?: number;
  height?: number;
  bytes?: number;
};

export type PhotoRow = {
  id: string;
  tankId: string | null;
  livestockId: string | null;
  logEntryId: string | null;
  scanId: string | null;
  localUri: string;
  caption: string | null;
  takenAt: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string;
  deletedAt: string | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function addPhoto(input: NewPhoto): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

/** Chronological, for the tank's photo gallery (specs/T-022) — most recent first. */
export async function listPhotosForTank(tankId: string): Promise<PhotoRow[]> {
  const rows = await json<PhotoRow[]>(await fetch(`/api/photos?tankId=${encodeURIComponent(tankId)}`));
  return rows.sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""));
}

export async function listPhotosForLogEntry(logEntryId: string): Promise<PhotoRow[]> {
  return json(await fetch(`/api/photos?logEntryId=${encodeURIComponent(logEntryId)}`));
}
