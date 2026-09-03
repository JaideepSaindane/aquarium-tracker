import fs from "node:fs/promises";
import path from "node:path";

let cachedSafetyRails: string | null = null;
let cachedGroundingFormat: string | null = null;

async function loadSafetyRails(): Promise<string> {
  if (cachedSafetyRails) return cachedSafetyRails;
  cachedSafetyRails = await fs.readFile(path.join(process.cwd(), "prompts", "_safety-rails.md"), "utf-8");
  return cachedSafetyRails;
}

async function loadGroundingFormat(): Promise<string> {
  if (cachedGroundingFormat) return cachedGroundingFormat;
  cachedGroundingFormat = await fs.readFile(path.join(process.cwd(), "prompts", "_grounding-format.md"), "utf-8");
  return cachedGroundingFormat;
}

export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

/** Loads prompts/<name> and fills {{VAR}} placeholders, including {{SAFETY_RAILS}}. */
export async function loadPrompt(filename: string, vars: Record<string, string>): Promise<string> {
  const template = await fs.readFile(path.join(process.cwd(), "prompts", filename), "utf-8");
  const safetyRails = await loadSafetyRails();
  const groundingFormat = await loadGroundingFormat();
  let out = template.replaceAll("{{SAFETY_RAILS}}", safetyRails).replaceAll("{{GROUNDING_FORMAT}}", groundingFormat);
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}
