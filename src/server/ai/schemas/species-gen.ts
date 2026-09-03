import { z } from "zod";
import { str, num, strArr, bool } from "./json-schema-helpers";

export const PROMPT_VERSION = "species-gen/v1";

// Nested shape — matches data/species.seed.json exactly (NOT the flat
// `species` table columns; T-011's queries/species.ts owns that mapping).
const SpeciesSeedZod = z.object({
  id: z.string(),
  scientific_name: z.string(),
  common_names: z.array(z.string()).default([]),
  common_names_in: z.array(z.string()).default([]),
  category: z.string(),
  source_refs: z.array(z.string()).default([]),
  temp_c: z.object({ min: z.number(), max: z.number() }),
  ph: z.object({ min: z.number(), max: z.number() }),
  hardness_dgh: z.object({ min: z.number(), max: z.number() }).optional(),
  adult_size_cm: z.number().optional(),
  min_volume_l: z.number(),
  min_footprint_cm: z.object({ length: z.number(), width: z.number() }).optional(),
  social_min_group: z.number().optional(),
  temperament: z.string(),
  swim_level: z.string().optional(),
  diet: z.string().optional(),
  difficulty: z.string().optional(),
  lifespan_years: z.object({ min: z.number(), max: z.number() }).optional(),
  breeding: z.string().optional(),
  care_notes: z.string(),
  common_mistakes: z.array(z.string()).default([]),
  incompatible_with: z.array(z.string()).default([]),
  disputed: z.string().default(""),
});

export const SpeciesGenZod = z.object({
  prompt_version: z.string(),
  species: SpeciesSeedZod,
  verified: z.literal(false),
  origin: z.literal("ai_generated"),
  uncertainty_note: z.string(),
  confidence: z.string(),
  flags: z.array(z.string()).default([]),
});

const rangeSchema = { type: "object", properties: { min: num, max: num }, required: ["min", "max"] };

export const SpeciesGenJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    species: {
      type: "object",
      properties: {
        id: str,
        scientific_name: str,
        common_names: strArr,
        common_names_in: strArr,
        category: str,
        source_refs: strArr,
        temp_c: rangeSchema,
        ph: rangeSchema,
        hardness_dgh: rangeSchema,
        adult_size_cm: num,
        min_volume_l: num,
        min_footprint_cm: { type: "object", properties: { length: num, width: num }, required: ["length", "width"] },
        social_min_group: num,
        temperament: str,
        swim_level: str,
        diet: str,
        difficulty: str,
        lifespan_years: rangeSchema,
        breeding: str,
        care_notes: str,
        common_mistakes: strArr,
        incompatible_with: strArr,
        disputed: str,
      },
      required: ["id", "scientific_name", "category", "temp_c", "ph", "min_volume_l", "temperament", "care_notes"],
    },
    verified: bool,
    origin: str,
    uncertainty_note: str,
    confidence: str,
    flags: strArr,
  },
  required: ["prompt_version", "species", "verified", "origin", "uncertainty_note", "confidence", "flags"],
};
