import { notifyChanged } from "../live";

// Rewritten 2026-09-11 to call the new user-scoped server API
// (src/app/api/log-entries/*) — see tanks.ts's header comment for the
// original pattern this follows.

export type NewLogEntry = {
  tankId: string;
  type: "journal" | "maintenance" | "incident" | "treatment" | "water_change";
  body: string;
  occurredAt?: string;
  waterChangedPct?: number;
};

export type LogEntryRow = {
  id: string;
  tankId: string;
  type: string | null;
  body: string | null;
  occurredAt: string;
  waterChangedPct: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function addLogEntry(input: NewLogEntry): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/log-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function listLogEntriesForTank(tankId: string): Promise<LogEntryRow[]> {
  return json(await fetch(`/api/log-entries?tankId=${encodeURIComponent(tankId)}`));
}

/** Every log entry across every tank — used by the T-026 metrics screen. */
export async function listAllLogEntries(): Promise<LogEntryRow[]> {
  return json(await fetch(`/api/log-entries?all=1`));
}
