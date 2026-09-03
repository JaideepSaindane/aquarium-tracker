// Derived checks that need no AI call — specs/T-016. Cheap, instant,
// offline. These are separate from compat/v1 (which needs a model call for
// nuanced multi-species reasoning); these are simple arithmetic against
// known rules of thumb.
import type { species } from "@/db/schema";

type SpeciesRow = typeof species.$inferSelect;

export type DerivedWarning = { key: string; severity: "watch" | "improve"; message: string };

/** Standard rule of thumb: filter should turn over the tank volume ~4x per hour. */
export function checkFilterFlow(volumeL: number, ratedLph: number | null | undefined): DerivedWarning | null {
  if (!ratedLph) return null;
  const turnoverPerHour = ratedLph / volumeL;
  if (turnoverPerHour < 4) {
    return {
      key: "derived:filter-flow",
      severity: "watch",
      message: `This filter turns over about ${turnoverPerHour.toFixed(1)}x the tank volume per hour — 4x or more is the usual guideline for a healthy filter.`,
    };
  }
  return null;
}

/** Rough rule of thumb: ~1W per litre for a tropical tank in a normal room. City/ambient temperature nuance belongs in the AI-backed checks, not here. */
export function checkHeaterWattage(volumeL: number, wattage: number | null | undefined): DerivedWarning | null {
  if (!wattage) return null;
  const wattsPerLitre = wattage / volumeL;
  if (wattsPerLitre < 0.7) {
    return {
      key: "derived:heater-wattage",
      severity: "watch",
      message: `This heater is about ${wattsPerLitre.toFixed(2)}W per litre — under ~0.7-1W/L can struggle to hold temperature in a cool room.`,
    };
  }
  return null;
}

/** Species kept below their minimum schooling group size — a common, easy-to-miss stress cause. */
export function checkSchoolingMinimums(
  livestockRows: { speciesId: string; count: number }[],
  speciesById: Map<string, SpeciesRow>
): DerivedWarning[] {
  const warnings: DerivedWarning[] = [];
  for (const l of livestockRows) {
    const species = speciesById.get(l.speciesId);
    if (!species?.socialMinGroup || species.socialMinGroup <= 1) continue;
    if (l.count < species.socialMinGroup) {
      const commonName = firstCommonName(species.commonNames) ?? l.speciesId;
      warnings.push({
        key: `derived:schooling:${l.speciesId}`,
        severity: "watch",
        message: `${commonName} does best in groups of ${species.socialMinGroup} or more — you have ${l.count}.`,
      });
    }
  }
  return warnings;
}

/** A single reading against its target range — used by the parameter log (specs/T-017) to mark out-of-range values with a plain-language reason, not just a red number. */
export function checkParameterOutOfRange(
  paramName: string,
  value: number,
  targetMin: number | null,
  targetMax: number | null,
  unit: string
): DerivedWarning | null {
  if (targetMin == null && targetMax == null) return null;
  const range = `${targetMin ?? "?"}–${targetMax ?? "?"}${unit}`;
  if (targetMin != null && value < targetMin) {
    return { key: `derived:param:${paramName}`, severity: "watch", message: `${paramName} is ${value}${unit} — below the target range of ${range}.` };
  }
  if (targetMax != null && value > targetMax) {
    return { key: `derived:param:${paramName}`, severity: "watch", message: `${paramName} is ${value}${unit} — above the target range of ${range}.` };
  }
  return null;
}

function firstCommonName(json: string | null): string | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
  } catch {
    return null;
  }
}
