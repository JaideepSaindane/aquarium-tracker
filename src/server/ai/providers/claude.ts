import Anthropic from "@anthropic-ai/sdk";
import type { AnalyseImageInput, AnswerInput, ModelProvider, ProviderResult } from "../types";

const MODEL_NAME = "claude-haiku-4-5-20251001";

// Claude has no direct "responseSchema" mode like Gemini — the reliable way
// to get schema-conformant JSON is forced tool use: define one tool whose
// input_schema is the contract's schema, force the model to call it, and
// read the JSON straight out of the tool_use block's `input`.
export function createClaudeProvider(apiKey: string): ModelProvider {
  const client = new Anthropic({ apiKey });

  async function run(promptText: string, responseSchema: Record<string, unknown>, image?: { base64: string; mimeType: string }): Promise<ProviderResult> {
    const content: Anthropic.MessageParam["content"] = [];
    if (image) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: image.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: image.base64 },
      });
    }
    content.push({ type: "text", text: promptText });

    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: 4096,
      tools: [{ name: "respond", description: "Return the structured response.", input_schema: responseSchema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: "respond" },
      messages: [{ role: "user", content }],
    });

    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) throw new Error("Claude did not return a tool_use block");

    return {
      text: JSON.stringify(toolUse.input),
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }

  return {
    name: "claude",
    analyseImage: (input: AnalyseImageInput) => run(input.promptText, input.responseSchema, { base64: input.imageBase64, mimeType: input.mimeType }),
    answer: (input: AnswerInput) => run(input.promptText, input.responseSchema),
  };
}
