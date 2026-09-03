import { z } from "zod";
import { str, strArr } from "./json-schema-helpers";

export const PROMPT_VERSION = "compat/v1";

const grounding = z.array(z.string()).default([]);

export const CompatZod = z.object({
  prompt_version: z.string(),
  verdict: z.string(),
  conflicts: z
    .array(
      z.object({
        type: z.string(),
        severity: z.string(),
        explanation: z.string(),
        with: z.array(z.string()).default([]),
        mitigation: z.string().default(""),
        grounding_refs: grounding,
      })
    )
    .default([]),
  footprint_note: z.string().default(""),
  disputed_note: z.string().default(""),
  grounding_refs: grounding,
});

export const CompatJsonSchema = {
  type: "object",
  properties: {
    prompt_version: str,
    verdict: str,
    conflicts: {
      type: "array",
      items: {
        type: "object",
        properties: { type: str, severity: str, explanation: str, with: strArr, mitigation: str, grounding_refs: strArr },
        required: ["type", "severity", "explanation", "with"],
      },
    },
    footprint_note: str,
    disputed_note: str,
    grounding_refs: strArr,
  },
  required: ["prompt_version", "verdict", "conflicts", "grounding_refs"],
};
