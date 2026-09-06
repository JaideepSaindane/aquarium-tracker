// T-027 — Guided Tank Setup Planner: deterministic, local, no-AI
// recommendations. Pure functions only — same family as derived-checks.ts
// (specs/T-016), just producing suggested values instead of pass/fail
// warnings. Every constant here was reviewed and signed off by Jaideep
// before implementation (specs/T-027's "numbers to be checked before
// build" gate; decisions recorded in specs/PROGRESS.md, 2026-09-06):
// - Heater: watts = litres × (target − room) × 0.3, rounded UP to the
//   next standard heater size. Chosen over the spec's rougher
//   "1W/L per 5°C" wording, which runs ~25% smaller than real heater
//   sizing charts and risks an undersized heater in a cold room.
// - Filter: 4× volume/hour turnover — the SAME constant
//   checkFilterFlow() already enforces (spec: reuse, don't diverge).
// - City room-temperature bands: static, bundled, offline (Principle 5).
//   Heater math uses the winter LOW (worst case). Jaideep approved the
//   bands as listed; every screen using them must also let the user
//   type their own room temperature instead, and an unknown city never
//   blocks saving (Principle 1).

export type PlantedTier = "bare_bottom" | "hardscape" | "planted";

// T-027 fish-first flow (Jaideep, 2026-09-06): the user picks a SIZE BAND,
// not exact dimensions — small/medium/large with honest ranges. The plan
// uses the band's working volume (low-middle of the range) so every
// recommendation holds for any tank they actually buy in that band.
export const SIZE_BANDS: Record<"small" | "medium" | "large", { label: string; hint: string; minL: number; maxL: number; planL: number; exampleCm: string }> = {
  small: { label: "Small", hint: "A desk or bedside tank", minL: 20, maxL: 45, planL: 35, exampleCm: "45×30×30 cm" },
  medium: { label: "Medium", hint: "The classic living-room tank", minL: 45, maxL: 120, planL: 75, exampleCm: "75×30×36 cm" },
  large: { label: "Large", hint: "A statement piece — needs real floor space", minL: 120, maxL: 400, planL: 180, exampleCm: "120×40×45 cm" },
};

export type CityClimate = {
  /** Representative indoor winter low, °C — the worst case the heater must hold against. */
  winterLowC: number;
  /** Representative indoor summer high, °C — context only, never used in heater math. */
  summerHighC: number;
  /** Human-readable band name shown in the UI so the number doesn't look invented. */
  band: string;
};

/**
 * Static, bundled room-temperature bands by Indian city/region — an
 * approximation of INDOOR temperatures, not outdoor weather (an indoor
 * tank sits in a heated/cooled room; outdoor data would mislead). Keys
 * are lowercase city names as typed into the city field; region keys
 * catch the rest via matchCityClimate's substring scan.
 */
export const CITY_CLIMATE: Record<string, CityClimate> = {
  // North plains
  delhi: { winterLowC: 15, summerHighC: 32, band: "North plains" },
  lucknow: { winterLowC: 15, summerHighC: 32, band: "North plains" },
  kanpur: { winterLowC: 15, summerHighC: 32, band: "North plains" },
  agra: { winterLowC: 15, summerHighC: 32, band: "North plains" },
  jaipur: { winterLowC: 15, summerHighC: 32, band: "North plains" },
  chandigarh: { winterLowC: 14, summerHighC: 31, band: "North plains" },
  amritsar: { winterLowC: 14, summerHighC: 31, band: "North plains" },
  ludhiana: { winterLowC: 14, summerHighC: 31, band: "North plains" },
  meerut: { winterLowC: 15, summerHighC: 32, band: "North plains" },
  ghaziabad: { winterLowC: 15, summerHighC: 32, band: "North plains" },
  faridabad: { winterLowC: 15, summerHighC: 32, band: "North plains" },
  patna: { winterLowC: 16, summerHighC: 32, band: "East / Gangetic plain" },
  varanasi: { winterLowC: 16, summerHighC: 32, band: "East / Gangetic plain" },
  allahabad: { winterLowC: 16, summerHighC: 32, band: "East / Gangetic plain" },
  // West coast — mild winters
  mumbai: { winterLowC: 23, summerHighC: 31, band: "West coast" },
  navi_mumbai: { winterLowC: 23, summerHighC: 31, band: "West coast" },
  thane: { winterLowC: 23, summerHighC: 31, band: "West coast" },
  kalyan: { winterLowC: 23, summerHighC: 31, band: "West coast" },
  vasai: { winterLowC: 23, summerHighC: 31, band: "West coast" },
  pune: { winterLowC: 19, summerHighC: 31, band: "Deccan interior" },
  goa: { winterLowC: 22, summerHighC: 31, band: "West coast" },
  // South
  bengaluru: { winterLowC: 18, summerHighC: 28, band: "Bengaluru / mild Deccan" },
  bangalore: { winterLowC: 18, summerHighC: 28, band: "Bengaluru / mild Deccan" },
  chennai: { winterLowC: 22, summerHighC: 32, band: "Coromandel coast" },
  hyderabad: { winterLowC: 22, summerHighC: 32, band: "Deccan interior" },
  coimbatore: { winterLowC: 21, summerHighC: 31, band: "Far south" },
  kochi: { winterLowC: 24, summerHighC: 31, band: "Far south" },
  kerala: { winterLowC: 24, summerHighC: 31, band: "Far south" },
  madurai: { winterLowC: 22, summerHighC: 32, band: "Far south" },
  mysore: { winterLowC: 19, summerHighC: 29, band: "Bengaluru / mild Deccan" },
  visakhapatnam: { winterLowC: 21, summerHighC: 31, band: "Coromandel coast" },
  vijayawada: { winterLowC: 21, summerHighC: 32, band: "Deccan interior" },
  // East
  kolkata: { winterLowC: 16, summerHighC: 32, band: "East / Gangetic plain" },
  howrah: { winterLowC: 16, summerHighC: 32, band: "East / Gangetic plain" },
  bhubaneswar: { winterLowC: 18, summerHighC: 32, band: "East coast" },
  guwahati: { winterLowC: 16, summerHighC: 31, band: "Northeast" },
  ranchi: { winterLowC: 15, summerHighC: 31, band: "East / Gangetic plain" },
  // West / Gujarat
  ahmedabad: { winterLowC: 17, summerHighC: 33, band: "Gujarat" },
  surat: { winterLowC: 18, summerHighC: 32, band: "Gujarat" },
  vadodara: { winterLowC: 17, summerHighC: 33, band: "Gujarat" },
  rajkot: { winterLowC: 17, summerHighC: 33, band: "Gujarat" },
  // Central
  nagpur: { winterLowC: 16, summerHighC: 33, band: "Central India" },
  bhopal: { winterLowC: 16, summerHighC: 33, band: "Central India" },
  indore: { winterLowC: 16, summerHighC: 33, band: "Central India" },
  jabalpur: { winterLowC: 15, summerHighC: 33, band: "Central India" },
  raipur: { winterLowC: 16, summerHighC: 33, band: "Central India" },
  // Northwest arid
  jodhpur: { winterLowC: 14, summerHighC: 33, band: "Northwest arid" },
  // Hills — genuinely cold winters
  srinagar: { winterLowC: 8, summerHighC: 24, band: "Hills" },
  shimla: { winterLowC: 8, summerHighC: 24, band: "Hills" },
  dehradun: { winterLowC: 12, summerHighC: 29, band: "Hills fringe" },
  // Generic India-wide fallback
  india: { winterLowC: 18, summerHighC: 30, band: "India-wide typical" },
};

const CITY_KEY_ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  trivandrum: "kerala",
  kochi: "kochi",
  cochin: "kochi",
  pondicherry: "chennai",
  gurgaon: "delhi",
  noida: "delhi",
  newdelhi: "delhi",
  "new delhi": "delhi",
};

/**
 * Resolves a free-text city to a climate band. Deliberately forgiving:
 * substring match over both the table keys and common alternate
 * spellings, then a region-word scan ("kerala", "goa", "hills"...).
 * Returns null when nothing matches — the caller must then either ask
 * for an approximate room temperature or fall back to the generic
 * India-wide band, and NEVER block saving (Principle 1).
 */
export function matchCityClimate(city: string | null | undefined): CityClimate | null {
  const raw = (city ?? "").trim().toLowerCase();
  if (!raw) return null;
  const collapsed = raw.replace(/[^a-z]/g, "");
  const alias = CITY_KEY_ALIASES[raw] ?? CITY_KEY_ALIASES[collapsed];
  if (alias && CITY_CLIMATE[alias]) return CITY_CLIMATE[alias];
  if (CITY_CLIMATE[raw]) return CITY_CLIMATE[raw];
  if (CITY_CLIMATE[collapsed]) return CITY_CLIMATE[collapsed];
  // Substring scan — "Navi Mumbai" hits "mumbai", "Kochi (Ernakulam)" hits "kochi".
  for (const [key, climate] of Object.entries(CITY_CLIMATE)) {
    if (key === "india") continue;
    if (collapsed.includes(key)) return climate;
  }
  return null;
}

/** The generic fallback band — used when a city is unknown, with the UI saying so plainly. */
export const GENERIC_INDIA_CLIMATE: CityClimate = CITY_CLIMATE.india;

// Standard aquarium heater sizes actually sold in India (W). The
// recommendation rounds UP to the next of these — an in-between value
// isn't purchasable, and rounding down would undersize the heater.
export const STANDARD_HEATER_WATTS = [25, 50, 75, 100, 150, 200, 300, 400] as const;

/**
 * Heater wattage: watts = litres × (target − room) × 0.3, rounded UP to
 * the next standard size. The 0.3 constant is the reviewed, chart-aligned
 * middle of real heater sizing tables (the old "1W/L per 5°C" rule of
 * thumb runs ~25% smaller and undersizes cold rooms). A gap of 0 or less
 * (room at or above target) needs no heater at all — returns null so the
 * UI can say so honestly instead of recommending a heater that will never
 * switch on.
 */
export function recommendHeaterWattage(volumeL: number, ambientTempC: number, targetTempC: number): number | null {
  if (volumeL <= 0) return null;
  const gap = targetTempC - ambientTempC;
  if (gap <= 0) return null;
  const rawWatts = volumeL * gap * 0.3;
  for (const size of STANDARD_HEATER_WATTS) {
    if (size >= rawWatts) return size;
  }
  return STANDARD_HEATER_WATTS[STANDARD_HEATER_WATTS.length - 1];
}

/**
 * True when the tank's real winter load sits close to the ceiling of the
 * recommended heater's band — i.e. an unusually cold snap, a draughty
 * room, or a big water change could out-run it. Drives Jaideep's
 * "colder winters → ~25% higher-rated heater" note: when raw demand is
 * within 20% of the recommended size, the next size up is the safer
 * winter pick, and the UI says so as a readable note rather than
 * silently inflating the number.
 */
export function winterNeedsHigherRating(volumeL: number, ambientTempC: number, targetTempC: number): boolean {
  if (volumeL <= 0) return false;
  const gap = targetTempC - ambientTempC;
  if (gap <= 0) return false;
  const rawWatts = volumeL * gap * 0.3;
  const recommended = recommendHeaterWattage(volumeL, ambientTempC, targetTempC);
  if (recommended === null) return false;
  return rawWatts >= recommended * 0.8;
}

// Same 4×/hour turnover constant checkFilterFlow() enforces on real
// equipment (specs/T-016) — the spec explicitly says reuse it, don't
// diverge. Planted tanks and heavier bioload get one extra turnover.
export const FILTER_TURNOVER_STANDARD = 4;

export function recommendFilterFlowRate(volumeL: number, planted: boolean, heavyBioload: boolean): number {
  if (volumeL <= 0) return 0;
  const turnover = FILTER_TURNOVER_STANDARD + (planted ? 1 : 0) + (heavyBioload ? 1 : 0);
  return Math.round(volumeL * turnover / 10) * 10;
}

/** Filter style by tank size — sponge for small/quarantine tanks, hang-on-back for mid, canister for large. Values match FILTER_SUBTYPES. */
export function recommendFilterSubtype(volumeL: number): "sponge" | "hang_on_back" | "canister" {
  if (volumeL <= 40) return "sponge";
  if (volumeL <= 120) return "hang_on_back";
  return "canister";
}

export type LightingRecommendation = {
  /** Rough fixture wattage — LED ratings vary hugely by brand, so this is a band, not a spec. */
  wattage: number;
  /** Fixture length in cm — matches the tank's length so it fits the rim. */
  fixtureLengthCm: number;
  /** Plain-language light level, shown to the user. */
  level: "low" | "medium" | "high";
};

/**
 * Lighting by planted tier (coarse banding is enough for v1, per spec):
 * bare bottom ~0.3W/L, hardscape ~0.4W/L, planted ~0.6W/L, planted+CO2
 * ~0.9W/L. Fixture length = tank length, rounded to a sane 30/60/90/120cm.
 */
export function recommendLighting(
  volumeL: number,
  tankLengthCm: number,
  tier: PlantedTier,
  hasCo2: boolean
): LightingRecommendation {
  const wattsPerLitre = tier === "planted" ? (hasCo2 ? 0.9 : 0.6) : tier === "hardscape" ? 0.4 : 0.3;
  const raw = volumeL * wattsPerLitre;
  const wattage = Math.max(5, Math.round(raw / 5) * 5);
  const fixtureLengthCm =
    tankLengthCm <= 40 ? 30 : tankLengthCm <= 70 ? 60 : tankLengthCm <= 100 ? 90 : tankLengthCm <= 135 ? 120 : 150;
  const level: LightingRecommendation["level"] = tier === "planted" ? (hasCo2 ? "high" : "medium") : "low";
  return { wattage, fixtureLengthCm, level };
}

export type SubstrateRecommendation = {
  /** Target depth in cm — 5 for planted (root-feeding plants need it), 3 for hardscape, 0 for bare bottom. */
  depthCm: number;
  /** Volume of substrate in litres (footprint × depth). */
  volumeL: number;
  /** Approximate weight in kg — substrate is sold by weight, roughly 1.5kg per litre for common gravels. */
  approxKg: number;
  /** null for bare bottom — nothing to buy. */
  kind: string | null;
};

const KG_PER_LITRE_SUBSTRATE = 1.5;

export function recommendSubstrate(
  lengthCm: number,
  widthCm: number,
  tier: PlantedTier
): SubstrateRecommendation {
  if (tier === "bare_bottom") {
    return { depthCm: 0, volumeL: 0, approxKg: 0, kind: null };
  }
  const depthCm = tier === "planted" ? 5 : 3;
  const volumeL = Math.round(((lengthCm * widthCm * depthCm) / 1000) * 10) / 10;
  return {
    depthCm,
    volumeL,
    approxKg: Math.round(volumeL * KG_PER_LITRE_SUBSTRATE),
    kind: tier === "planted" ? "Planted-tank substrate (nutrient-rich)" : "Gravel or sand (inert)",
  };
}

export type HardscapeRecommendation = {
  /** What to add, in plain language. */
  item: string;
  /** Why — tied to the species that triggered it, so it doesn't read as arbitrary. */
  reason: string;
};

/**
 * A small, honest rule table keyed on what the chosen species' catalog
 * rows actually say (temperament, swim level, category, pH range) — NOT a
 * per-species lookup the 445-entry catalog can't support yet. Starts
 * short by design (spec: "starts short, grows over time, never blocks
 * save if empty"); deduped so the same advice never repeats.
 */
export function recommendHardscape(
  speciesRows: { temperament?: string | null; swimLevel?: string | null; category?: string | null; phMin?: number | null; phMax?: number | null }[]
): HardscapeRecommendation[] {
  const out: HardscapeRecommendation[] = [];
  const seen = new Set<string>();
  const add = (item: string, reason: string) => {
    if (seen.has(item)) return;
    seen.add(item);
    out.push({ item, reason });
  };

  const temperaments = speciesRows.map((s) => s.temperament ?? "");
  const categories = speciesRows.map((s) => s.category ?? "");

  if (temperaments.some((t) => t === "aggressive" || t === "territorial" || t === "semi-aggressive")) {
    add(
      "Hiding spots (caves, dense plants, or broken lines of sight)",
      "Breaks up territory so nippy or territorial fish can get away from each other"
    );
  }
  if (temperaments.some((t) => t === "aggressive")) {
    add("Floating plants", "Bettas and other surface-oriented fish rest under them and build bubble nests");
  }
  if (categories.includes("shrimp") || categories.includes("snail")) {
    add("Moss or fine-leaved plants", "Gives shrimp and baby snails surfaces to graze and places to hide while moulting");
  }
  if (speciesRows.some((s) => (s.phMax ?? 8) < 7.2)) {
    add("Driftwood or botanicals (leaf litter)", "Slowly releases tannins that soften water toward the acidic range these fish prefer");
  }
  if (speciesRows.some((s) => s.swimLevel === "bottom")) {
    add("Smooth, rounded decor only", "Bottom-dwellers sift and rub along the floor — sharp edges can injure their barbels");
  }
  return out;
}

export type SpeciesTempRange = { tempCMin?: number | null; tempCMax?: number | null };

/**
 * The safe target temperature for a planned community: the OVERLAP of
 * every chosen species' own range (highest min, lowest max) — the actual
 * constraint the tank is under, same logic the tank page already uses
 * for real livestock. No species (or no temperature data) → a neutral
 * 25°C default, stated as such.
 */
export const DEFAULT_TARGET_TEMP_C = 25;

export function recommendTargetTemp(speciesRows: SpeciesTempRange[]): { min: number; max: number } | null {
  const withData = speciesRows.filter((s) => s.tempCMin != null && s.tempCMax != null);
  if (withData.length === 0) return null;
  return {
    min: Math.max(...withData.map((s) => s.tempCMin as number)),
    max: Math.min(...withData.map((s) => s.tempCMax as number)),
  };
}

/** Midpoint of the overlap range, for heater math. Falls back to the 25°C default when there's no data. */
export function targetTempForHeater(speciesRows: SpeciesTempRange[]): number {
  const range = recommendTargetTemp(speciesRows);
  if (!range) return DEFAULT_TARGET_TEMP_C;
  // An empty or inverted overlap (incompatible species) can't be honoured —
  // fall back rather than compute a nonsense target.
  if (range.min > range.max) return DEFAULT_TARGET_TEMP_C;
  return Math.round(((range.min + range.max) / 2) * 10) / 10;
}

// ---------------------------------------------------------------------------
// The composed plan — one call the planner page renders and lets the user
// edit row by row. Everything stays individually editable per Principle 1;
// these are suggestions, never locked values.

export type PlanSpeciesRow = {
  temperament?: string | null;
  swimLevel?: string | null;
  category?: string | null;
  phMin?: number | null;
  phMax?: number | null;
  tempCMin?: number | null;
  tempCMax?: number | null;
};

export type SetupPlanInput = {
  volumeL: number;
  lengthCm: number;
  widthCm: number;
  tier: PlantedTier;
  hasCo2: boolean;
  /** Chosen species' catalog rows (may be empty — every recommendation must still work). */
  speciesRows: PlanSpeciesRow[];
  /** Resolved room-temperature band (winter low drives heater math), or null when the city is unknown. */
  climate: CityClimate | null;
  /** User-typed room temperature, when they chose to give one — overrides the city band. */
  customRoomTempC: number | null;
};

export type SetupPlan = {
  heaterWatts: number | null;
  heaterNote: string | null;
  filterFlowLph: number;
  filterSubtype: "sponge" | "hang_on_back" | "canister";
  lighting: LightingRecommendation;
  substrate: SubstrateRecommendation;
  hardscape: HardscapeRecommendation[];
  targetTempRange: { min: number; max: number } | null;
  /** The room temperature actually used for heater math, with its source — shown so the number never looks invented. */
  roomTempUsed: { value: number; source: "your home" | "city typical" | "India-wide typical" } | null;
};

export function buildSetupPlan(input: SetupPlanInput): SetupPlan {
  const targetRange = recommendTargetTemp(input.speciesRows);
  const targetTemp = targetTempForHeater(input.speciesRows);

  // Room temperature precedence: user-typed > city band > generic India
  // band. The source is surfaced so the UI can say plainly where the
  // number came from (spec: "based on typical [city] temperatures").
  let roomTempUsed: SetupPlan["roomTempUsed"] = null;
  if (input.customRoomTempC != null) {
    roomTempUsed = { value: input.customRoomTempC, source: "your home" };
  } else if (input.climate) {
    roomTempUsed = { value: input.climate.winterLowC, source: "city typical" };
  } else {
    roomTempUsed = { value: GENERIC_INDIA_CLIMATE.winterLowC, source: "India-wide typical" };
  }

  const heaterWatts = recommendHeaterWattage(input.volumeL, roomTempUsed.value, targetTemp);
  let heaterNote: string | null = null;
  if (heaterWatts !== null && winterNeedsHigherRating(input.volumeL, roomTempUsed.value, targetTemp)) {
    heaterNote =
      "Winters here can push a heater this size to its limit — if your room runs cold in winter, the next size up (or a second smaller heater) is the safer pick.";
  }

  const heavyBioload = input.speciesRows.length >= 3;
  const filterFlowLph = recommendFilterFlowRate(input.volumeL, input.tier === "planted", heavyBioload);

  return {
    heaterWatts,
    heaterNote,
    filterFlowLph,
    filterSubtype: recommendFilterSubtype(input.volumeL),
    lighting: recommendLighting(input.volumeL, input.lengthCm, input.tier, input.hasCo2),
    substrate: recommendSubstrate(input.lengthCm, input.widthCm, input.tier),
    hardscape: recommendHardscape(input.speciesRows),
    targetTempRange: targetRange,
    roomTempUsed,
  };
}
