import type { ModelProvider } from "../types";
import { createGeminiProvider } from "./gemini";
import { createClaudeProvider } from "./claude";

export type ProviderName = "gemini" | "claude";

// The default provider is a one-line change — T-013 acceptance criterion 7.
export const DEFAULT_PROVIDER: ProviderName = "gemini";

/**
 * `apiKey` is required and explicit (never read from env inside this
 * function) — see `serverApiKeyFor()` below, the one place that reads it
 * from env.
 */
export function getProvider(name: ProviderName, apiKey: string): ModelProvider {
  switch (name) {
    case "gemini":
      return createGeminiProvider(apiKey);
    case "claude":
      return createClaudeProvider(apiKey);
  }
}

export function serverApiKeyFor(name: ProviderName): string | undefined {
  if (name === "gemini") return process.env.GEMINI_API_KEY;
  if (name === "claude") return process.env.ANTHROPIC_API_KEY;
  return undefined;
}
