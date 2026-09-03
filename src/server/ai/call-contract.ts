import type { ZodType } from "zod";
import type { ModelProvider } from "./types";
import { estimateCostUsd } from "./types";
import { stripCodeFences } from "./prompt-loader";
import { findUnresolvableRefs } from "./retrieval";

export type ContractCallResult<T> =
  | {
      ok: true;
      data: T;
      meta: { provider: string; tokensIn: number; tokensOut: number; costUsd: number; latencyMs: number };
      unresolvableRefs: string[]; // logged by the caller as an error per T-013 acceptance criterion 10 — never blocks the response
    }
  | { ok: false; error: string; detail: string };

/**
 * Runs one contract: calls the provider, validates the JSON against the
 * Zod schema, retries once with a corrective prompt on failure, and
 * cross-checks every grounding_ref against real species/corpus ids.
 * Never throws for a bad model response — only for real infrastructure
 * failure (network, missing key), which the caller should catch separately.
 */
export async function callContract<T extends { prompt_version: string }>({
  provider,
  promptText,
  promptVersion,
  jsonSchema,
  zodSchema,
  image,
  extractGroundingRefs,
}: {
  provider: ModelProvider;
  promptText: string;
  /** The real, authoritative version string — stamped onto the response after validation, never trusted from the model. Discovered live: Gemini invented "1.0" when nothing told it what to return. */
  promptVersion: string;
  jsonSchema: Record<string, unknown>;
  zodSchema: ZodType<T>;
  image?: { base64: string; mimeType: string };
  extractGroundingRefs: (data: T) => string[];
}): Promise<ContractCallResult<T>> {
  const startedAt = Date.now();

  async function attempt(text: string) {
    return image
      ? provider.analyseImage({ imageBase64: image.base64, mimeType: image.mimeType, promptText: text, responseSchema: jsonSchema })
      : provider.answer({ promptText: text, responseSchema: jsonSchema });
  }

  let result = await attempt(promptText);
  let parsed = tryValidate(zodSchema, result.text);

  if (!parsed.success) {
    const retryPrompt = `${promptText}\n\n---\nYour previous response failed validation with this error:\n${parsed.error}\nReturn ONLY corrected JSON matching the schema. No markdown fences, no commentary.`;
    result = await attempt(retryPrompt);
    parsed = tryValidate(zodSchema, result.text);

    if (!parsed.success) {
      return { ok: false, error: "Could not analyse this — the model's response didn't match the required format twice in a row.", detail: String(parsed.error) };
    }
  }

  parsed.data.prompt_version = promptVersion;
  const unresolvableRefs = await findUnresolvableRefs(extractGroundingRefs(parsed.data));

  return {
    ok: true,
    data: parsed.data,
    meta: {
      provider: provider.name,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costUsd: estimateCostUsd(provider.name, result.tokensIn, result.tokensOut),
      latencyMs: Date.now() - startedAt,
    },
    unresolvableRefs,
  };
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(stripCodeFences(text));
  } catch {
    return undefined;
  }
}

function tryValidate<T>(schema: ZodType<T>, text: string) {
  const json = tryParse(text);
  return schema.safeParse(json);
}
