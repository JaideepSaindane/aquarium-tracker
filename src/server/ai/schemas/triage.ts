import { z } from "zod";
import { str, strArr, num } from "./json-schema-helpers";

export const PROMPT_VERSION = "triage/v1";

const grounding = z.array(z.string()).default([]);

export const TriageZod = z.object({
  prompt_version: z.string(),
  first_action: z.string(),
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
  conditional_guidance: z.array(z.object({ if: z.string(), then: z.string(), grounding_refs: grounding })).default([]),
  escalate: z.object({
    needed: z.boolean(),
    reason: z.string().nullable().default(null),
    human_health_warning: z.string().nullable().default(null),
  }),
  confidence: z.string(),
  could_not_determine: z.array(z.string()).default([]),
  clarifying_questions: z.array(z.object({ question: z.string(), why: z.string() })).default([]),
  grounding_refs: grounding,
});

export type TriageReport = z.infer<typeof TriageZod>;

export const TriageJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    first_action: str,
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
    confidence: str,
    could_not_determine: strArr,
    clarifying_questions: {
      type: "array",
      items: { type: "object", properties: { question: str, why: str }, required: ["question", "why"] },
    },
    grounding_refs: strArr,
  },
  required: ["prompt_version", "first_action", "do_not", "escalate", "confidence", "could_not_determine", "grounding_refs"],
};
