import { z } from "zod";
import { str, strArr, num } from "./json-schema-helpers";

// v3, 2026-09-15: redesigned around decision-usefulness rather than
// diagnostic completeness (Jaideep's Fish Doctor brief). Key changes from
// v2: `confidence` splits into `diagnosis`/`actionability` (a low-confidence
// diagnosis must not suppress high-confidence first-aid actions — see
// prompts/triage.v3.md's "Critical Principle"); added `headline`/`summary`
// for a scannable status card; added `urgency` (independent of confidence);
// added `monitor_for` ("Watch for") and `escalation_triggers` ("Get help
// urgently if") as their own lists, distinct from `escalate` (THIS case's
// own active escalation call); removed `could_not_determine` — a bare list
// of unknowns wasn't useful, folded into `clarifying_questions` (max 3,
// only the ones that would change the next step) and `conditional_guidance`
// (reframed in the prompt/UI as "what would change the next step").
// `first_action` is kept (many older logged incidents reference it) but
// must now equal immediate_actions[0].action — the UI no longer shows it
// as a separate card to avoid the old duplicate-action bug.
export const PROMPT_VERSION = "triage/v3";

const grounding = z.array(z.string()).default([]);
const urgencyEnum = z.enum(["low", "moderate", "high", "critical"]);
const confidenceEnum = z.enum(["low", "moderate", "high"]);

export const TriageZod = z.object({
  prompt_version: z.string(),
  headline: z.string(),
  summary: z.string(),
  urgency: urgencyEnum,
  first_action: z.string(),
  confidence: z.object({
    diagnosis: confidenceEnum,
    actionability: confidenceEnum,
  }),
  hypotheses: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        likelihood: z.string(),
        reasoning: z.string(),
        confirm_by: z.string(),
        grounding_refs: grounding,
      })
    )
    .default([]),
  immediate_actions: z
    .array(z.object({ order: z.number(), action: z.string(), why: z.string(), caution: z.string().nullable().default(null) }))
    .default([]),
  do_not: z.array(z.string()).default([]),
  monitor_for: z.array(z.string()).default([]),
  escalation_triggers: z.array(z.string()).default([]),
  conditional_guidance: z.array(z.object({ if: z.string(), then: z.string(), grounding_refs: grounding })).default([]),
  escalate: z.object({
    needed: z.boolean(),
    reason: z.string().nullable().default(null),
    human_health_warning: z.string().nullable().default(null),
  }),
  clarifying_questions: z.array(z.object({ question: z.string(), why: z.string() })).default([]),
  grounding_refs: grounding,
  medical_disclaimer: z.boolean().default(false),
});

export type TriageReport = z.infer<typeof TriageZod>;

export const TriageJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    headline: str,
    summary: str,
    urgency: { type: "string", enum: ["low", "moderate", "high", "critical"] },
    first_action: str,
    confidence: {
      type: "object",
      properties: {
        diagnosis: { type: "string", enum: ["low", "moderate", "high"] },
        actionability: { type: "string", enum: ["low", "moderate", "high"] },
      },
      required: ["diagnosis", "actionability"],
    },
    hypotheses: {
      type: "array",
      items: {
        type: "object",
        properties: { id: str, name: str, likelihood: str, reasoning: str, confirm_by: str, grounding_refs: strArr },
        required: ["id", "name", "likelihood", "reasoning"],
      },
    },
    immediate_actions: {
      type: "array",
      items: {
        type: "object",
        properties: { order: num, action: str, why: str, caution: { type: "string", nullable: true } },
        required: ["order", "action", "why"],
      },
    },
    do_not: strArr,
    monitor_for: strArr,
    escalation_triggers: strArr,
    conditional_guidance: {
      type: "array",
      items: { type: "object", properties: { if: str, then: str, grounding_refs: strArr }, required: ["if", "then"] },
    },
    escalate: {
      type: "object",
      properties: {
        needed: { type: "boolean" },
        reason: { type: "string", nullable: true },
        human_health_warning: { type: "string", nullable: true },
      },
      required: ["needed"],
    },
    clarifying_questions: {
      type: "array",
      items: { type: "object", properties: { question: str, why: str }, required: ["question", "why"] },
    },
    grounding_refs: strArr,
    medical_disclaimer: { type: "boolean" },
  },
  required: [
    "prompt_version",
    "headline",
    "summary",
    "urgency",
    "first_action",
    "confidence",
    "do_not",
    "escalate",
    "grounding_refs",
    "medical_disclaimer",
  ],
};
