import { z } from "zod";
import { str, strArr } from "./json-schema-helpers";

// v2, 2026-09-04: added a rule against treating the tank context's "days
// since added to the app" as real tank age for cycling-stage answers —
// same bug/fix as tank-scan/v2, see prompts/ask.v2.md.
export const PROMPT_VERSION = "ask/v2";

const grounding = z.array(z.string()).default([]);

export const AskZod = z.object({
  prompt_version: z.string(),
  answer: z.string(),
  detail: z.string().default(""),
  confidence: z.string(),
  based_on_your_tank: z.array(z.string()).default([]),
  actions: z
    .array(
      z.object({
        label: z.string(),
        type: z.string(),
        payload: z.record(z.string(), z.unknown()).default({}),
      })
    )
    .default([]),
  warnings: z.array(z.object({ severity: z.string(), text: z.string() })).default([]),
  grounding_refs: grounding,
  uncovered: z.boolean().default(false),
  follow_up_questions: z.array(z.string()).default([]),
});

export type AskAnswer = z.infer<typeof AskZod>;

export const AskJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    answer: str,
    detail: str,
    confidence: str,
    based_on_your_tank: strArr,
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: { label: str, type: str, payload: { type: "object" } },
        required: ["label", "type"],
      },
    },
    warnings: {
      type: "array",
      items: { type: "object", properties: { severity: str, text: str }, required: ["severity", "text"] },
    },
    grounding_refs: strArr,
    uncovered: { type: "boolean" },
    follow_up_questions: strArr,
  },
  required: ["prompt_version", "answer", "confidence", "based_on_your_tank", "grounding_refs", "uncovered"],
};
