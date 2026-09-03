import { z } from "zod";

// Mirrors docs/03-ai-contracts.md Contract 1 exactly. Kept loose on strings that
// are really enums (severity, clarity, etc.) via z.string() rather than z.enum()
// so a slightly-off model value doesn't fail validation outright — but every
// field the app actually renders on is required, since a missing field here
// would otherwise surface as a confusing blank in the UI.

const grounding = z.array(z.string()).default([]);
// 0.0-1.0 fields — bounded so a model that reverts to a 0-10 scale (observed
// in practice on 2026-08-31) fails validation and gets a corrective retry
// instead of silently shipping a wrong number. `stocking` is the one score
// allowed above 1.0 (>1 means overstocked per docs/03-ai-contracts.md).
const unit = z.number().min(0).max(1);

export const TankReportSchema = z.object({
  prompt_version: z.string(),
  image_quality: z.object({
    usable: z.boolean(),
    issues: z.array(z.string()).default([]),
    advice: z.string().default(""),
  }),
  tank_estimate: z.object({
    visible_water_level_ok: z.boolean(),
    clarity: z.string(),
    clarity_note: z.string().default(""),
  }),
  // No `livestock` field — species identification was removed from Tank Scan
  // on 2026-08-31 after T-002 showed it unreliable on schooling nano fish.
  // See docs/03-ai-contracts.md Contract 1. Livestock is now added by hand.
  setup: z.object({
    type: z.string(),
    confidence: unit,
    note: z.string().default(""),
  }),
  plants: z
    .array(
      z.object({
        label: z.string(),
        confidence: unit,
        condition: z.string(),
      })
    )
    .default([]),
  plant_mass: z.object({ score: unit, descriptor: z.string() }),
  algae: z
    .array(
      z.object({
        type: z.string(),
        severity: z.string(),
        location: z.string(),
        confidence: unit,
      })
    )
    .default([]),
  equipment_visible: z
    .array(
      z.object({
        type: z.string(),
        subtype: z.string().default(""),
        confidence: unit,
      })
    )
    .default([]),
  hardscape: z.object({
    substrate: z.string(),
    decor: z.array(z.string()).default([]),
  }),
  scores: z.object({
    health: unit,
    algae_burden: unit,
    planting: unit,
  }),
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
    .array(
      z.object({
        preset_type: z.string(),
        interval_days: z.number(),
        why: z.string(),
        suggested_amount: z.string().default(""),
      })
    )
    .default([]),
  could_not_determine: z.array(z.string()).default([]),
  clarifying_questions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        type: z.string(),
        why: z.string(),
      })
    )
    .default([]),
  grounding_refs: grounding,
});
