import { eq, sql } from "drizzle-orm";
import { db } from "../client";
import { species } from "../schema";
import { nowIso } from "../id";
import { notifyChanged } from "../live";

export async function listSpecies() {
  return db.select().from(species);
}

export async function getSpecies(id: string) {
  const rows = await db.select().from(species).where(eq(species.id, id));
  return rows[0];
}

export async function countSpecies() {
  const rows = await listSpecies();
  return rows.length;
}

/** Simple substring search over id/common names/scientific name — good enough for the local `species` table's size. */
export async function searchSpecies(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await listSpecies();
  return all.filter((s) => {
    const commonNames = safeParseArray(s.commonNames).concat(safeParseArray(s.commonNamesIn));
    return (
      s.id.includes(q) ||
      s.scientificName?.toLowerCase().includes(q) ||
      commonNames.some((name) => name.toLowerCase().includes(q))
    );
  });
}

function safeParseArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Inserts an AI-generated provisional species card (species-gen/v1) —
 * Principle 03: never a dead end. Saved and usable immediately, marked
 * unverified, queued for human review (review workflow is a later task).
 */
export async function insertGeneratedSpecies(payload: {
  species: SeedSpecies;
  uncertaintyNote: string;
  confidence: string;
  flags: string[];
}) {
  const now = nowIso();
  const s = payload.species;
  await db
    .insert(species)
    .values({
      id: s.id,
      scientificName: s.scientific_name,
      commonNames: JSON.stringify(s.common_names ?? []),
      commonNamesIn: JSON.stringify(s.common_names_in ?? []),
      category: s.category,
      verified: false,
      sourceRefs: JSON.stringify(s.source_refs ?? []),
      tempCMin: s.temp_c?.min,
      tempCMax: s.temp_c?.max,
      phMin: s.ph?.min,
      phMax: s.ph?.max,
      hardnessDghMin: s.hardness_dgh?.min,
      hardnessDghMax: s.hardness_dgh?.max,
      adultSizeCm: s.adult_size_cm,
      minVolumeL: s.min_volume_l,
      minFootprintLengthCm: s.min_footprint_cm?.length,
      minFootprintWidthCm: s.min_footprint_cm?.width,
      socialMinGroup: s.social_min_group,
      temperament: s.temperament,
      swimLevel: s.swim_level,
      diet: s.diet,
      difficulty: s.difficulty,
      lifespanMinYears: s.lifespan_years?.min,
      lifespanMaxYears: s.lifespan_years?.max,
      breeding: s.breeding,
      careNotes: s.care_notes,
      commonMistakes: JSON.stringify(s.common_mistakes ?? []),
      incompatibleWith: JSON.stringify(s.incompatible_with ?? []),
      disputed: s.disputed,
      origin: "ai_generated",
      uncertaintyNote: payload.uncertaintyNote,
      aiConfidence: payload.confidence,
      flags: JSON.stringify(payload.flags ?? []),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  notifyChanged();
  return s.id;
}

// Shape of data/species.seed.json — nested, unlike the flat `species` table.
// See docs/02-data-model.md "Seed file shape vs table shape" for the mapping.
export type SeedSpecies = {
  id: string;
  scientific_name: string;
  common_names?: string[];
  common_names_in?: string[];
  category?: string;
  verified?: boolean;
  source_refs?: string[];
  temp_c?: { min: number; max: number };
  ph?: { min: number; max: number };
  hardness_dgh?: { min: number; max: number };
  adult_size_cm?: number;
  min_volume_l?: number;
  min_footprint_cm?: { length: number; width: number };
  social_min_group?: number;
  temperament?: string;
  swim_level?: string;
  diet?: string;
  difficulty?: string;
  lifespan_years?: { min: number; max: number };
  breeding?: string;
  care_notes?: string;
  common_mistakes?: string[];
  incompatible_with?: string[];
  disputed?: string;
  dex?: { rarity?: string; tier?: number };
  /** Bundled static reference photo, e.g. "/species/betta.jpg" — see the schema comment on `imageUri`. */
  image?: string;
};

/**
 * Loads data/species.seed.json into the species table on first launch, and
 * on version bump — without touching rows the user or AI created (origin
 * != 'seed'). Idempotent: re-running with the same seed data is a no-op
 * after the first load (upsert by id).
 */
export async function seedSpecies(seedData: SeedSpecies[]) {
  const now = nowIso();
  for (const s of seedData) {
    await db
      .insert(species)
      .values({
        id: s.id,
        scientificName: s.scientific_name,
        commonNames: JSON.stringify(s.common_names ?? []),
        commonNamesIn: JSON.stringify(s.common_names_in ?? []),
        category: s.category,
        verified: s.verified ?? false,
        sourceRefs: JSON.stringify(s.source_refs ?? []),
        tempCMin: s.temp_c?.min,
        tempCMax: s.temp_c?.max,
        phMin: s.ph?.min,
        phMax: s.ph?.max,
        hardnessDghMin: s.hardness_dgh?.min,
        hardnessDghMax: s.hardness_dgh?.max,
        adultSizeCm: s.adult_size_cm,
        minVolumeL: s.min_volume_l,
        minFootprintLengthCm: s.min_footprint_cm?.length,
        minFootprintWidthCm: s.min_footprint_cm?.width,
        socialMinGroup: s.social_min_group,
        temperament: s.temperament,
        swimLevel: s.swim_level,
        diet: s.diet,
        difficulty: s.difficulty,
        lifespanMinYears: s.lifespan_years?.min,
        lifespanMaxYears: s.lifespan_years?.max,
        breeding: s.breeding,
        careNotes: s.care_notes,
        commonMistakes: JSON.stringify(s.common_mistakes ?? []),
        incompatibleWith: JSON.stringify(s.incompatible_with ?? []),
        disputed: s.disputed,
        origin: "seed",
        dexRarity: s.dex?.rarity,
        dexTier: s.dex?.tier,
        imageUri: s.image,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: species.id,
        set: {
          // Only overwrite fields the seed file owns — never touch rows a
          // user edited or that came from species-gen/v1 (origin != 'seed'
          // rows are never touched at all, see the WHERE guard below).
          // Full column list since the 445→1,484 corpus rebuild
          // (2026-09-10): a reseed must deliver the rebuilt care data
          // (temp/pH/size/volume etc.) to species that already exist, not
          // just append new ones — the old minimal set (scientificName/
          // careNotes/imageUri) predates any seed that changed those fields.
          // `verified` is deliberately NOT here: it is the human-review
          // flag and the seed always writes false, so updating it would
          // un-review a species on every unrelated reseed.
          scientificName: s.scientific_name,
          commonNames: JSON.stringify(s.common_names ?? []),
          commonNamesIn: JSON.stringify(s.common_names_in ?? []),
          category: s.category,
          sourceRefs: JSON.stringify(s.source_refs ?? []),
          tempCMin: s.temp_c?.min,
          tempCMax: s.temp_c?.max,
          phMin: s.ph?.min,
          phMax: s.ph?.max,
          hardnessDghMin: s.hardness_dgh?.min,
          hardnessDghMax: s.hardness_dgh?.max,
          adultSizeCm: s.adult_size_cm,
          minVolumeL: s.min_volume_l,
          minFootprintLengthCm: s.min_footprint_cm?.length,
          minFootprintWidthCm: s.min_footprint_cm?.width,
          socialMinGroup: s.social_min_group,
          temperament: s.temperament,
          swimLevel: s.swim_level,
          diet: s.diet,
          difficulty: s.difficulty,
          lifespanMinYears: s.lifespan_years?.min,
          lifespanMaxYears: s.lifespan_years?.max,
          breeding: s.breeding,
          careNotes: s.care_notes,
          commonMistakes: JSON.stringify(s.common_mistakes ?? []),
          incompatibleWith: JSON.stringify(s.incompatible_with ?? []),
          disputed: s.disputed,
          dexRarity: s.dex?.rarity,
          dexTier: s.dex?.tier,
          imageUri: s.image,
          updatedAt: now,
        },
        where: sql`${species.origin} = 'seed'`,
      });
  }
  notifyChanged();
}
