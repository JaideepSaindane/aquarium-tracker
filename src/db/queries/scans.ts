import { notifyChanged } from "../live";

// Rewritten 2026-09-11 to call the new user-scoped server API
// (src/app/api/scans/*) — see tanks.ts's header comment for the original
// pattern this follows.

export type NewScan = {
  tankId: string;
  imageUri: string;
  modelName: string;
  modelVersion?: string;
  promptVersion: string;
  rawResponse: unknown;
  findings?: unknown;
  scores?: unknown;
  userCorrections?: unknown;
};

export type ScanRow = {
  id: string;
  tankId: string;
  imageUri: string;
  modelName: string;
  modelVersion: string | null;
  promptVersion: string;
  rawResponse: string;
  findings: string | null;
  scores: string | null;
  userCorrections: string | null;
  createdAt: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/** The full raw_response is kept forever — it's the evaluation set (specs/T-015). */
export async function createScan(input: NewScan): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function listScansForTank(tankId: string): Promise<ScanRow[]> {
  return json(await fetch(`/api/scans?tankId=${encodeURIComponent(tankId)}`));
}

/** Every scan across every tank — used by the T-026 activation metric (tank + scan within 48h of install). */
export async function listAllScans(): Promise<ScanRow[]> {
  return json(await fetch(`/api/scans?all=1`));
}
