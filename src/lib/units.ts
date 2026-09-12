// Display-layer unit conversion — CLAUDE.md's rule holds: every value is
// stored in metric (cm, litres, °C) always; these helpers only format a
// stored metric number for however the viewer prefers to read it. Never
// used to decide what gets written to the database.

export type UnitSystem = "metric" | "imperial";

export const CM_PER_IN = 2.54;
export const L_PER_GAL = 3.78541; // US gallon

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function formatLength(cm: number, system: UnitSystem, decimals = 0): string {
  if (system === "metric") return `${round(cm, decimals)} cm`;
  return `${round(cm / CM_PER_IN, decimals)} in`;
}

export function formatVolume(liters: number, system: UnitSystem, decimals = 1): string {
  if (system === "metric") return `${round(liters, decimals)} L`;
  return `${round(liters / L_PER_GAL, decimals)} gal`;
}

/** Always shows both units together, per the redesign brief's own example ("54.9 L · 14.5 gal") — used on entry screens where the auto-computed volume should read as an equivalence, not something the viewer has to toggle. */
export function formatVolumeDual(liters: number): string {
  return `${round(liters, 1)} L · ${round(liters / L_PER_GAL, 1)} gal`;
}

export function formatTemp(celsius: number, system: UnitSystem, decimals = 0): string {
  if (system === "metric") return `${round(celsius, decimals)}°C`;
  return `${round((celsius * 9) / 5 + 32, decimals)}°F`;
}

/** Formats a min–max range (e.g. a safe temperature band) in one unit system, not a per-endpoint dual format — used where the existing UI already showed a "24–28°C"-style range. */
export function formatTempRange(minC: number, maxC: number, system: UnitSystem, decimals = 0): string {
  if (system === "metric") return `${round(minC, decimals)}–${round(maxC, decimals)}°C`;
  const toF = (c: number) => (c * 9) / 5 + 32;
  return `${round(toF(minC), decimals)}–${round(toF(maxC), decimals)}°F`;
}
