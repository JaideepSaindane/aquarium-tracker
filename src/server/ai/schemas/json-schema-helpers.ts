// Shared primitives for the JSON Schema objects passed to both providers
// (Gemini's responseSchema and Claude's tool input_schema both accept the
// same JSON Schema subset, so one schema object serves both).
export const str = { type: "string" };
export const num = { type: "number" };
export const bool = { type: "boolean" };
export const strArr = { type: "array", items: str };
// Confidence/score fields are 0.0-1.0 decimals, never 0-10 — see
// tank-scan-harness's schema.js, where a model reverted to 0-10 once in
// testing and produced a self-contradictory report. Bounding it here is
// the first line of defense; the Zod schema (validate.ts) is the second.
export const unit = { type: "number", minimum: 0, maximum: 1 };
