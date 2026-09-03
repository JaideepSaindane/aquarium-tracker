import { z } from "zod";
import { str, num, bool, strArr, unit as jsonUnit } from "./json-schema-helpers";

// v2, 2026-09-04: added an optional "tank record" input (existing
// equipment/livestock/parameters/log entries, from buildTankContext) so a
// re-check of an already-set-up tank can give sharper, personalized
// findings instead of only ever reasoning from the bare photo — see
// prompts/tank-scan.v2.md for the exact rules this unlocks.
export const PROMPT_VERSION = "tank-scan/v2";

const grounding = z.array(z.string()).default([]);
// Separate from the JSON-Schema `unit` above — that one's a plain object
// for Gemini/Claude's responseSchema, this one's an actual Zod type. Mixing
// them up here once crashed every /scan call with "expected a Zod schema".
const unit = z.number().min(0).max(1);

export const TankScanZod = z.object({
  prompt_version: z.string(),
  image_quality: z.object({ usable: z.boolean(), issues: z.array(z.string()).default([]), advice: z.string().default("") }),
  tank_estimate: z.object({ visible_water_level_ok: z.boolean(), clarity: z.string(), clarity_note: z.string().default("") }),
  setup: z.object({ type: z.string(), confidence: unit, note: z.string().default("") }),
  plants: z.array(z.object({ label: z.string(), confidence: unit, condition: z.string() })).default([]),
  plant_mass: z.object({ score: unit, descriptor: z.string() }),
  algae: z.array(z.object({ type: z.string(), severity: z.string(), location: z.string(), confidence: unit })).default([]),
  equipment_visible: z.array(z.object({ type: z.string(), subtype: z.string().default(""), confidence: unit })).default([]),
  hardscape: z.object({ substrate: z.string(), decor: z.array(z.string()).default([]) }),
  scores: z.object({ health: unit, algae_burden: unit, planting: unit }),
  findings: z
    .array(
      z.object({
        id: z.string(),
        severity: z.string(),
        title: z.string(),
        explanation: z.string(),
        recommended_action: z.string(),
        grounding_refs: grounding,
        confidence: unit,
      })
    )
    .default([]),
  recommended_maintenance: z
    .array(z.object({ preset_type: z.string(), interval_days: z.number(), why: z.string(), suggested_amount: z.string().default("") }))
    .default([]),
  could_not_determine: z.array(z.string()).default([]),
  clarifying_questions: z.array(z.object({ id: z.string(), question: z.string(), type: z.string(), why: z.string() })).default([]),
  grounding_refs: grounding,
});

export type TankScanReport = z.infer<typeof TankScanZod>;

export const TankScanJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    image_quality: { type: "object", properties: { usable: bool, issues: strArr, advice: str }, required: ["usable"] },
    tank_estimate: {
      type: "object",
      properties: { visible_water_level_ok: bool, clarity: str, clarity_note: str },
      required: ["visible_water_level_ok", "clarity"],
    },
    setup: { type: "object", properties: { type: str, confidence: jsonUnit, note: str }, required: ["type", "confidence"] },
    plants: {
      type: "array",
      items: { type: "object", properties: { label: str, confidence: jsonUnit, condition: str }, required: ["label", "confidence", "condition"] },
    },
    plant_mass: { type: "object", properties: { score: jsonUnit, descriptor: str }, required: ["score", "descriptor"] },
    algae: {
      type: "array",
      items: {
        type: "object",
        properties: { type: str, severity: str, location: str, confidence: jsonUnit },
        required: ["type", "severity", "confidence"],
      },
    },
    equipment_visible: {
      type: "array",
      items: { type: "object", properties: { type: str, subtype: str, confidence: jsonUnit }, required: ["type", "confidence"] },
    },
    hardscape: { type: "object", properties: { substrate: str, decor: strArr }, required: ["substrate"] },
    scores: {
      type: "object",
      properties: { health: jsonUnit, algae_burden: jsonUnit, planting: jsonUnit },
      required: ["health", "algae_burden", "planting"],
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: str,
          severity: str,
          title: str,
          explanation: str,
          recommended_action: str,
          grounding_refs: strArr,
          confidence: jsonUnit,
        },
        required: ["id", "severity", "title", "explanation", "confidence"],
      },
    },
    recommended_maintenance: {
      type: "array",
      items: {
        type: "object",
        properties: { preset_type: str, interval_days: num, why: str, suggested_amount: str },
        required: ["preset_type", "interval_days", "why"],
      },
    },
    could_not_determine: strArr,
    clarifying_questions: {
      type: "array",
      items: { type: "object", properties: { id: str, question: str, type: str, why: str }, required: ["id", "question", "type"] },
    },
    grounding_refs: strArr,
  },
  required: [
    "prompt_version",
    "image_quality",
    "tank_estimate",
    "setup",
    "plants",
    "plant_mass",
    "algae",
    "equipment_visible",
    "hardscape",
    "scores",
    "findings",
    "recommended_maintenance",
    "could_not_determine",
    "clarifying_questions",
    "grounding_refs",
  ],
};
