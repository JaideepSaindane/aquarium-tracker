// Shared scan logic used by both the live workbench (server.js /api/scan)
// and the T-002 batch evaluator (eval/eval-run.js). One code path so the
// evaluation is actually testing the same thing a person clicking "Scan tank"
// gets — a batch script with its own re-implementation would be worthless.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { TankReportSchema } from "./schema.js";
import { tankReportGeminiSchema } from "./gemini-schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROMPT_VERSION = "tank-scan/v1";
// gemini-2.5-flash-lite was retired for new API keys some time after this
// project's docs were written (discovered by hitting a live 404 on 2026-08-31,
// which named gemini-3.5-flash-lite as its replacement). Swapped to that.
// Re-verify this is still current and re-check pricing at
// ai.google.dev/gemini-api/docs/pricing before trusting PRICE_* for real budgeting.
export const MODEL_NAME = "gemini-3.5-flash-lite";
export const PRICE_IN_PER_M = 0.1;
export const PRICE_OUT_PER_M = 0.4;

let genAI = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY. Copy .env.example to .env and put your key in it. " +
        "Get one at https://aistudio.google.com — use a PAID key, not the free tier."
    );
  }
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

// ---- species reference data (the "retrieval" for this harness) ----
// Corpus (T-004) doesn't exist yet, and the seed set is only 30 rows, so for
// this workbench we include the whole compact species list rather than doing
// real relevance filtering. The real app (T-013) does proper retrieval.
let speciesContextText = null;
let speciesList = null;
export async function loadSpeciesContext() {
  if (speciesContextText !== null) return speciesContextText;
  const seedPath = path.join(__dirname, "..", "data", "species.seed.json");
  const raw = await fs.readFile(seedPath, "utf-8");
  speciesList = JSON.parse(raw);
  speciesContextText = speciesList
    .map((s) => {
      const t = s.temp_c ? `${s.temp_c.min}-${s.temp_c.max}C` : "?";
      const ph = s.ph ? `pH ${s.ph.min}-${s.ph.max}` : "";
      const fp = s.min_footprint_cm ? `${s.min_footprint_cm.length}x${s.min_footprint_cm.width}cm min` : "";
      return `- ${s.id} | ${s.common_names?.[0] ?? s.id} | ${t} | ${ph} | ${s.min_volume_l ?? "?"}L min | ${fp} | ${s.temperament ?? ""}`;
    })
    .join("\n");
  console.log(`Loaded ${speciesList.length} species for retrieval context.`);
  return speciesContextText;
}
export async function getSpeciesList() {
  await loadSpeciesContext();
  return speciesList;
}

async function loadPromptTemplate() {
  const p = path.join(__dirname, "prompts", "tank-scan.v1.md");
  return fs.readFile(p, "utf-8");
}

function fillTemplate(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
}

function stripCodeFences(text) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

async function callGemini(promptText, imageBuffer, mimeType) {
  const model = getClient().getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: tankReportGeminiSchema,
    },
  });

  const result = await model.generateContent([
    { text: promptText },
    { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
  ]);

  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata ?? {};
  return {
    text,
    tokensIn: usage.promptTokenCount ?? 0,
    tokensOut: usage.candidatesTokenCount ?? 0,
  };
}

/**
 * Runs one Tank Scan. Returns { ok: true, report, meta } on success, or
 * { ok: false, error, detail } when the model's output failed validation
 * twice in a row — never throws for a bad model response, only for real
 * infrastructure failure (network, missing key, unreadable image).
 */
export async function runScan({ imageBuffer, length, width, height, city }) {
  const startedAt = Date.now();
  await loadSpeciesContext();
  const volumeL = Math.round(((length * width * height) / 1000) * 10) / 10;

  const originalBytes = imageBuffer.length;
  const resized = await sharp(imageBuffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const resizedBytes = resized.length;

  const template = await loadPromptTemplate();
  const promptText = fillTemplate(template, {
    LENGTH_CM: length,
    WIDTH_CM: width,
    HEIGHT_CM: height,
    VOLUME_L: volumeL,
    CITY: city || "(not provided)",
    SPECIES_CONTEXT: speciesContextText,
  });

  let attempt = await callGemini(promptText, resized, "image/jpeg");
  let parsed;
  let validationError = null;
  try {
    parsed = TankReportSchema.parse(JSON.parse(stripCodeFences(attempt.text)));
  } catch (err) {
    validationError = String(err);
    const retryPrompt =
      promptText +
      `\n\n---\nYour previous response failed validation with this error:\n${validationError}\n` +
      `Return ONLY corrected JSON matching the schema. No markdown fences, no commentary.`;
    attempt = await callGemini(retryPrompt, resized, "image/jpeg");
    try {
      parsed = TankReportSchema.parse(JSON.parse(stripCodeFences(attempt.text)));
    } catch (err2) {
      return {
        ok: false,
        error: "Could not analyse this photo — the model's response didn't match the required format twice in a row.",
        detail: String(err2),
        firstError: validationError,
        rawResponses: [attempt.text],
      };
    }
  }

  const tokensIn = attempt.tokensIn;
  const tokensOut = attempt.tokensOut;
  const costUsd = (tokensIn / 1_000_000) * PRICE_IN_PER_M + (tokensOut / 1_000_000) * PRICE_OUT_PER_M;
  const elapsedMs = Date.now() - startedAt;

  return {
    ok: true,
    report: parsed,
    meta: { tokensIn, tokensOut, costUsd, originalBytes, resizedBytes, elapsedMs },
  };
}
