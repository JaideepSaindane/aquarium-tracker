// Gemini structured-output schema (OpenAPI-subset format Gemini expects via
// responseSchema). Mirrors schema.js (the Zod validator) and, ultimately,
// docs/03-ai-contracts.md Contract 1. Keeping this in its own file because
// it's verbose and not something you should have to read to understand the
// contract — read docs/03-ai-contracts.md or schema.js for that.

const str = { type: "string" };
const num = { type: "number" };
const bool = { type: "boolean" };
const strArr = { type: "array", items: str };
// Confidence and most scores are decimals 0.0-1.0, never a 0-10 scale — the
// model reverted to 0-10 once in testing (2026-08-31), producing a
// self-contradictory report (algae_burden: 9.5 alongside algae type "none").
// schema.js enforces this with a hard min/max + retry; these hints are a
// second line of defense so a well-behaved model gets it right the first time.
const unit = { type: "number", minimum: 0, maximum: 1 };

export const tankReportGeminiSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    image_quality: {
      type: "object",
      properties: { usable: bool, issues: strArr, advice: str },
      required: ["usable"],
    },
    tank_estimate: {
      type: "object",
      properties: {
        visible_water_level_ok: bool,
        clarity: str,
        clarity_note: str,
      },
      required: ["visible_water_level_ok", "clarity"],
    },
    // No livestock field — species ID removed from Tank Scan 2026-08-31.
    setup: {
      type: "object",
      properties: { type: str, confidence: unit, note: str },
      required: ["type", "confidence"],
    },
    plants: {
      type: "array",
      items: {
        type: "object",
        properties: { label: str, confidence: unit, condition: str },
        required: ["label", "confidence", "condition"],
      },
    },
    plant_mass: {
      type: "object",
      properties: { score: unit, descriptor: str },
      required: ["score", "descriptor"],
    },
    algae: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: str,
          severity: str,
          location: str,
          confidence: unit,
        },
        required: ["type", "severity", "confidence"],
      },
    },
    equipment_visible: {
      type: "array",
      items: {
        type: "object",
        properties: { type: str, subtype: str, confidence: unit },
        required: ["type", "confidence"],
      },
    },
    hardscape: {
      type: "object",
      properties: { substrate: str, decor: strArr },
      required: ["substrate"],
    },
    scores: {
      type: "object",
      properties: {
        health: unit,
        algae_burden: unit,
        planting: unit,
      },
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
          confidence: unit,
        },
        required: ["id", "severity", "title", "explanation", "confidence"],
      },
    },
    recommended_maintenance: {
      type: "array",
      items: {
        type: "object",
        properties: {
          preset_type: str,
          interval_days: num,
          why: str,
          suggested_amount: str,
        },
        required: ["preset_type", "interval_days", "why"],
      },
    },
    could_not_determine: strArr,
    clarifying_questions: {
      type: "array",
      items: {
        type: "object",
        properties: { id: str, question: str, type: str, why: str },
        required: ["id", "question", "type"],
      },
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
