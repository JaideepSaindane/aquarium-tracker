import { z } from "zod";
import { str, strArr } from "./json-schema-helpers";

export const PROMPT_VERSION = "planner/v1";

const grounding = z.array(z.string()).default([]);

export const PlannerZod = z.object({
  prompt_version: z.string(),
  // 2-3 sentence plain-language read on their wish list.
  summary: z.string(),
  // Catalog ids the AI confirms are a good fit for this tank/band.
  recommended_species_ids: z.array(z.string()).default([]),
  // Catalog ids the AI suggests as additions or swaps — each with a reason.
  suggested_fish: z
    .array(
      z.object({
        species_id: z.string(),
        count: z.number().int().positive().default(1),
        why: z.string(),
        grounding_refs: grounding,
      })
    )
    .default([]),
  // Plant picks for planted tanks (catalog plant ids), matched to light level.
  suggested_plants: z
    .array(
      z.object({
        species_id: z.string(),
        why: z.string(),
        grounding_refs: grounding,
      })
    )
    .default([]),
  // Honest stocking warnings — overstocking, aggression, temperature mismatch.
  stocking_notes: z
    .array(
      z.object({
        severity: z.enum(["info", "watch", "warning"]),
        note: z.string(),
        grounding_refs: grounding,
      })
    )
    .default([]),
  grounding_refs: grounding,
});

export const PlannerJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    summary: str,
    recommended_species_ids: strArr,
    suggested_fish: {
      type: "array",
      items: {
        type: "object",
        properties: {
          species_id: str,
          count: { type: "number" },
          why: str,
          grounding_refs: strArr,
        },
        required: ["species_id", "why"],
      },
    },
    suggested_plants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          species_id: str,
          why: str,
          grounding_refs: strArr,
        },
        required: ["species_id", "why"],
      },
    },
    stocking_notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: str,
          note: str,
          grounding_refs: strArr,
        },
        required: ["severity", "note"],
      },
    },
    grounding_refs: strArr,
  },
  required: ["prompt_version", "summary", "grounding_refs"],
};
