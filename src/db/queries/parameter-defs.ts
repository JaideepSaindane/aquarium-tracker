import { notifyChanged } from "../live";
import { STANDARD_PARAMETERS } from "@/lib/standard-parameters";

// Rewritten 2026-09-11: the 8 global default parameters are a plain
// constant now (src/lib/standard-parameters.ts), not database rows — see
// that file's header comment for why. Only genuine per-tank
// overrides/custom parameters are real user data, and those now call the
// server API (src/app/api/parameter-defs/*), same pattern as tanks.ts.

export type ParameterDefRow = {
  id: string;
  tankId: string | null;
  name: string;
  unit: string;
  targetMin: number | null;
  targetMax: number | null;
  decimals: number | null;
  sortOrder: number | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function globalDefsAsRows(): ParameterDefRow[] {
  const now = new Date(0).toISOString();
  return STANDARD_PARAMETERS.map((p) => ({
    id: `global:${p.name}`,
    tankId: null,
    name: p.name,
    unit: p.unit,
    targetMin: p.targetMin,
    targetMax: p.targetMax,
    decimals: p.decimals,
    sortOrder: p.sortOrder,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function listGlobalParameterDefs(): Promise<ParameterDefRow[]> {
  return globalDefsAsRows();
}

/**
 * Effective parameter list for a tank (specs/T-017): every global default,
 * replaced by a tank-specific override where one exists (matched by name —
 * "a shrimp tank and a discus tank want different targets for the same
 * reading"), plus any purely custom parameters the tank added that don't
 * shadow a global one.
 */
export async function getEffectiveParameterDefs(tankId: string): Promise<ParameterDefRow[]> {
  const globals = globalDefsAsRows();
  const tankRows = await json<ParameterDefRow[]>(await fetch(`/api/parameter-defs?tankId=${encodeURIComponent(tankId)}`));
  const overrideByName = new Map(tankRows.map((r) => [r.name, r]));
  const merged = globals.map((g) => overrideByName.get(g.name) ?? g);
  const mergedNames = new Set(merged.map((m) => m.name));
  const customOnly = tankRows.filter((r) => !mergedNames.has(r.name));
  return [...merged, ...customOnly].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

/** Creates or updates this tank's target range for a parameter that already exists globally (an "override"), matched by name. */
export async function setTankParameterTarget(
  tankId: string,
  base: { name: string; unit: string; decimals: number | null; sortOrder: number | null },
  targetMin: number | null,
  targetMax: number | null
): Promise<void> {
  await fetch("/api/parameter-defs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tankId, name: base.name, unit: base.unit, decimals: base.decimals, sortOrder: base.sortOrder, targetMin, targetMax }),
  });
  notifyChanged();
}

export type NewCustomParameter = { tankId: string; name: string; unit: string; targetMin?: number; targetMax?: number; decimals?: number };

/** A parameter that doesn't exist globally at all — free for now; T-025 is expected to gate this behind Pro. */
export async function addCustomParameter(input: NewCustomParameter): Promise<void> {
  await fetch("/api/parameter-defs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, sortOrder: 99, decimals: input.decimals ?? 1 }),
  });
  notifyChanged();
}

/** No longer needed — global defaults are a constant now, not seeded rows. Kept as a no-op so existing boot-time callers don't need editing. */
export async function seedParameterDefs(): Promise<void> {
  // intentionally empty
}
