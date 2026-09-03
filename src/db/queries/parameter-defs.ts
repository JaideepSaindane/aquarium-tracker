import { eq, isNull, and } from "drizzle-orm";
import { db } from "../client";
import { parameterDefs } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

// The eight standard parameters, free forever per CLAUDE.md/Principle 02.
// Global defaults (tankId: null); per-tank overrides come from T-017.
const STANDARD_PARAMETERS = [
  { name: "Ammonia", unit: "ppm", targetMin: 0, targetMax: 0.25, decimals: 2, sortOrder: 1 },
  { name: "Nitrite", unit: "ppm", targetMin: 0, targetMax: 0.25, decimals: 2, sortOrder: 2 },
  { name: "Nitrate", unit: "ppm", targetMin: 0, targetMax: 20, decimals: 0, sortOrder: 3 },
  { name: "pH", unit: "", targetMin: 6.5, targetMax: 7.5, decimals: 1, sortOrder: 4 },
  { name: "GH", unit: "dGH", targetMin: 4, targetMax: 12, decimals: 0, sortOrder: 5 },
  { name: "KH", unit: "dKH", targetMin: 3, targetMax: 8, decimals: 0, sortOrder: 6 },
  { name: "Temperature", unit: "°C", targetMin: 22, targetMax: 28, decimals: 1, sortOrder: 7 },
  { name: "TDS", unit: "ppm", targetMin: 100, targetMax: 300, decimals: 0, sortOrder: 8 },
] as const;

export async function listGlobalParameterDefs() {
  return db.select().from(parameterDefs).where(isNull(parameterDefs.tankId));
}

/**
 * Effective parameter list for a tank (specs/T-017): every global default,
 * replaced by a tank-specific override where one exists (matched by name —
 * "a shrimp tank and a discus tank want different targets for the same
 * reading"), plus any purely custom parameters the tank added that don't
 * shadow a global one.
 */
export async function getEffectiveParameterDefs(tankId: string) {
  const [globals, tankRows] = await Promise.all([
    listGlobalParameterDefs(),
    db.select().from(parameterDefs).where(eq(parameterDefs.tankId, tankId)),
  ]);
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
) {
  const now = nowIso();
  const existing = await db
    .select()
    .from(parameterDefs)
    .where(and(eq(parameterDefs.tankId, tankId), eq(parameterDefs.name, base.name)));

  if (existing[0]) {
    await db.update(parameterDefs).set({ targetMin, targetMax, updatedAt: now }).where(eq(parameterDefs.id, existing[0].id));
  } else {
    await db.insert(parameterDefs).values({
      id: newId(),
      tankId,
      name: base.name,
      unit: base.unit,
      targetMin,
      targetMax,
      decimals: base.decimals,
      sortOrder: base.sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  notifyChanged();
}

export type NewCustomParameter = { tankId: string; name: string; unit: string; targetMin?: number; targetMax?: number; decimals?: number };

/** A parameter that doesn't exist globally at all — free for now; T-025 is expected to gate this behind Pro. */
export async function addCustomParameter(input: NewCustomParameter) {
  const now = nowIso();
  await db.insert(parameterDefs).values({
    id: newId(),
    tankId: input.tankId,
    name: input.name,
    unit: input.unit,
    targetMin: input.targetMin,
    targetMax: input.targetMax,
    decimals: input.decimals ?? 1,
    sortOrder: 99,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  notifyChanged();
}

/** Seeds the eight global default parameters if they don't already exist. Idempotent. */
export async function seedParameterDefs() {
  const existing = await listGlobalParameterDefs();
  if (existing.length > 0) return;
  const now = nowIso();
  for (const p of STANDARD_PARAMETERS) {
    await db.insert(parameterDefs).values({
      id: newId(),
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
    });
  }
  notifyChanged();
}
