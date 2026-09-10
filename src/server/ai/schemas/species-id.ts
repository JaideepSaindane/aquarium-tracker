import { z } from "zod";
import { str, strArr, bool } from "./json-schema-helpers";

export const PROMPT_VERSION = "species-id/v2";

const unit = z.number().min(0).max(1);

// The model identifies freely from its own knowledge — it no longer sees or
// is constrained to our catalog (Jaideep's call, 2026-09-03: restricting to
// our 1,484 species meant a real fish outside that list could never be
// identified at all). `species_id` is added server-side after the model
// responds, by matching `scientific_name`/`common_name` against our catalog
// — see matchSpeciesId() in server/ai/retrieval.ts — so it's absent from
// this schema entirely; a candidate may or may not end up with one.
export const SpeciesIdZod = z.object({
  prompt_version: z.string(),
  image_quality: z.object({ usable: z.boolean(), issues: z.array(z.string()).default([]), advice: z.string().default("") }),
  candidates: z
    .array(z.object({ common_name: z.string(), scientific_name: z.string(), confidence: unit, why: z.string() }))
    .max(3)
    .default([]),
  could_not_determine: z.array(z.string()).default([]),
  clarifying_questions: z.array(z.object({ question: z.string(), why: z.string() })).default([]),
});

export const SpeciesIdJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    image_quality: { type: "object", properties: { usable: bool, issues: strArr, advice: str }, required: ["usable"] },
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: { common_name: str, scientific_name: str, confidence: { type: "number", minimum: 0, maximum: 1 }, why: str },
        required: ["common_name", "scientific_name", "confidence", "why"],
      },
    },
    could_not_determine: strArr,
    clarifying_questions: {
      type: "array",
      items: { type: "object", properties: { question: str, why: str }, required: ["question", "why"] },
    },
  },
  required: ["prompt_version", "image_quality", "candidates", "could_not_determine"],
};
