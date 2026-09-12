import { z } from "zod";
import { str, strArr } from "./json-schema-helpers";

// Health Check v1 (2026-09-12) — a dedicated contract for the re-runnable
// "Health Check" on an already-set-up tank, separate from the onboarding
// Tank Scan contract (tank-scan.ts) which stays untouched (it serves a
// different job: detecting setup/equipment/plants on a brand-new tank).
// Built from Jaideep's own pasted framework spec — see the framework
// document itself for the full reasoning behind each design choice below;
// summarized in comments at the points that matter.
export const PROMPT_VERSION = "health-check/v1";

const grounding = z.array(z.string()).default([]);
const status = z.enum(["ok", "watch", "warning", "critical", "na"]);
const confidence = z.enum(["high", "medium", "low"]);

export const HEALTH_CHECK_CATEGORIES = [
  "water_clarity",
  "algae",
  "fish_appearance",
  "cleanliness",
  "plants",
  "water_level",
  "equipment",
  "stocking",
] as const;
export type HealthCheckCategory = (typeof HEALTH_CHECK_CATEGORIES)[number];

// `overall_status` is deliberately NOT something we ask the model for —
// framework §6/§7: it must be the worst status among the real checks, not
// a separately-guessed field that could contradict the details. See
// deriveOverallStatus() below, used server-side after parsing.
export const HealthCheckZod = z.object({
  prompt_version: z.string(),
  photo_quality: z.enum(["good", "limited", "insufficient"]),
  tank_type_inferred: z.enum(["freshwater", "saltwater", "planted", "unclear"]),
  summary: z.string(),
  checks: z
    .array(
      z.object({
        category: z.enum(HEALTH_CHECK_CATEGORIES),
        status,
        confidence,
        observation: z.string(),
        possible_causes: z.array(z.string()).default([]),
        // Present only when status isn't ok/na — framework §6: forcing a
        // tip on a healthy category invites generic filler.
        tip: z.string().default(""),
        grounding_refs: grounding,
      })
    )
    .default([]),
  grounding_refs: grounding,
});

export type HealthCheckReport = z.infer<typeof HealthCheckZod> & { overall_status: z.infer<typeof status> };

const SEVERITY_RANK: Record<z.infer<typeof status>, number> = { critical: 4, warning: 3, watch: 2, ok: 1, na: 0 };

/** Worst non-`na` status among the checks — framework §7's aggregation rule, computed here rather than trusted from the model. */
export function deriveOverallStatus(checks: { status: z.infer<typeof status> }[]): z.infer<typeof status> {
  const real = checks.filter((c) => c.status !== "na");
  if (real.length === 0) return "ok";
  return real.reduce((worst, c) => (SEVERITY_RANK[c.status] > SEVERITY_RANK[worst] ? c.status : worst), "ok" as z.infer<typeof status>);
}

export const HealthCheckJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    photo_quality: str,
    tank_type_inferred: str,
    summary: str,
    checks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: str,
          status: str,
          confidence: str,
          observation: str,
          possible_causes: strArr,
          tip: str,
          grounding_refs: strArr,
        },
        required: ["category", "status", "confidence", "observation"],
      },
    },
    grounding_refs: strArr,
  },
  required: ["prompt_version", "photo_quality", "tank_type_inferred", "summary", "checks", "grounding_refs"],
};
