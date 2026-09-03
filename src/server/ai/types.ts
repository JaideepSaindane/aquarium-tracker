// The provider adapter interface — docs/03-ai-contracts.md / specs/T-013.
// Swapping the default provider is a one-line change (see providers/index.ts).
export type ModelMessage = { role: "user" | "assistant"; content: string };

export type AnalyseImageInput = {
  imageBase64: string;
  mimeType: string;
  promptText: string;
  responseSchema: Record<string, unknown>; // Gemini/Claude structured-output schema
};

export type AnswerInput = {
  promptText: string;
  responseSchema: Record<string, unknown>;
};

export type ProviderResult = {
  text: string;
  tokensIn: number;
  tokensOut: number;
};

export interface ModelProvider {
  name: string;
  analyseImage(input: AnalyseImageInput): Promise<ProviderResult>;
  answer(input: AnswerInput): Promise<ProviderResult>;
}

// $ per million tokens. Re-verify at each provider's pricing page before
// trusting these for real budgeting — see docs/03-ai-contracts.md.
export const PROVIDER_PRICING: Record<string, { inPerM: number; outPerM: number }> = {
  gemini: { inPerM: 0.1, outPerM: 0.4 },
  claude: { inPerM: 1.0, outPerM: 5.0 },
};

export function estimateCostUsd(provider: string, tokensIn: number, tokensOut: number): number {
  const pricing = PROVIDER_PRICING[provider];
  if (!pricing) return 0;
  return (tokensIn / 1_000_000) * pricing.inPerM + (tokensOut / 1_000_000) * pricing.outPerM;
}
