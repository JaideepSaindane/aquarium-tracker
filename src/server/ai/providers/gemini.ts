import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalyseImageInput, AnswerInput, ModelProvider, ProviderResult } from "../types";

// gemini-2.5-flash-lite was retired for new API keys (discovered building
// the T-001 harness, 2026-08-31) — the live API pointed to this replacement.
// Re-verify this is still current before relying on it.
const MODEL_NAME = "gemini-3.5-flash-lite";

/**
 * Fresh instance per call — never a module-level singleton holding a key.
 * That matters for bring-your-own-key mode: a serverless function instance
 * can be reused across requests from different users, and a cached client
 * bound to one user's key must never serve another user's request.
 */
export function createGeminiProvider(apiKey: string): ModelProvider {
  const client = new GoogleGenerativeAI(apiKey);

  async function run(promptText: string, responseSchema: Record<string, unknown>, image?: { base64: string; mimeType: string }): Promise<ProviderResult> {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        // The SDK's TS types want its own narrower `Schema` type; our JSON
        // Schema objects (shared with Claude's tool input_schema) match the
        // runtime shape Gemini actually expects, just not that exact type.
        responseSchema: responseSchema as never,
        maxOutputTokens: 4096,
      },
    });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: promptText }];
    if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });

    const result = await model.generateContent(parts);
    const response = result.response;
    const usage = response.usageMetadata;
    return {
      text: response.text(),
      tokensIn: usage?.promptTokenCount ?? 0,
      tokensOut: usage?.candidatesTokenCount ?? 0,
    };
  }

  return {
    name: "gemini",
    analyseImage: (input: AnalyseImageInput) => run(input.promptText, input.responseSchema, { base64: input.imageBase64, mimeType: input.mimeType }),
    answer: (input: AnswerInput) => run(input.promptText, input.responseSchema),
  };
}
