// One-time batch job (2026-09-15, Jaideep: "I want a genuine full app
// translation for hinglish") — translates every species' prose fields
// (care_notes, common_mistakes, disputed) into Hinglish (Hindi, Latin
// script, the same style the rest of the app's Hinglish UI strings use)
// and writes them back into data/species.seed.json as `_hi` sibling
// fields. Resumable: skips any species that already has `care_notes_hi`
// (or has no English content to translate in the first place), so a
// re-run after an interruption only translates what's left. Saves the
// file periodically, not just at the very end, so a crash partway through
// doesn't lose completed work.
//
// Run with: node --env-file=.env.local scripts/translate-species-hinglish.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SEED_PATH = path.join(process.cwd(), "data", "species.seed.json");
const MODEL_NAME = "gemini-3.5-flash-lite";
// This API key is on the free tier: 15 requests/minute for this model.
// Back to 4.5s spacing (13.3/min) per Jaideep, 2026-09-15: "no real users
// right now other than me testing" — the earlier rising-429s concern
// assumed real traffic contention that isn't actually happening yet.
const REQUEST_SPACING_MS = 4500;
const SAVE_EVERY = 25;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY not set — run with: node --env-file=.env.local scripts/translate-species-hinglish.mjs");
  process.exit(1);
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    care_notes_hi: { type: "string" },
    common_mistakes_hi: { type: "array", items: { type: "string" } },
    disputed_hi: { type: "string" },
  },
  required: [],
};

function buildPrompt(species) {
  const parts = [];
  parts.push(
    `Translate the following freshwater-aquarium care text for "${species.common_names?.[0] ?? species.id}" (${species.scientific_name}) into Hinglish — Hindi, written in plain Latin script (the way Indian aquarium hobbyists actually text each other), NOT Devanagari script. Keep it natural and conversational, not a stiff word-for-word translation. Keep species names, chemical terms (pH, dGH, ppm), and units in their usual form (these are commonly left in English/Latin even in Hinglish speech). Preserve the meaning exactly — do not add or remove advice.`
  );
  parts.push(`Output strict JSON matching the schema. Only include a key if the corresponding English field below is present.`);
  if (species.care_notes) parts.push(`\ncare_notes (English):\n${species.care_notes}`);
  if (species.common_mistakes?.length) parts.push(`\ncommon_mistakes (English, one per line):\n${species.common_mistakes.join("\n")}`);
  if (species.disputed) parts.push(`\ndisputed (English):\n${species.disputed}`);
  return parts.join("\n");
}

async function translateOne(species) {
  const prompt = buildPrompt(species);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 2048,
    },
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429 && attempt < 4) {
          // Pull the API's own suggested retryDelay out of the error body
          // rather than guessing — it already told us exactly how long.
          const match = errText.match(/"retryDelay":\s*"(\d+)s"/);
          const waitMs = match ? Number(match[1]) * 1000 + 1000 : 15000 * attempt;
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No text in response");
      return JSON.parse(text);
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

// A single-lane queue, one request every REQUEST_SPACING_MS — no
// concurrency. Simpler and safer than a token-bucket for a one-off batch
// job against a 15-req/min free-tier key.
async function runQueue(queue, results, stats) {
  while (queue.length > 0) {
    const species = queue.shift();
    const start = Date.now();
    try {
      const translated = await translateOne(species);
      if (translated.care_notes_hi) species.care_notes_hi = translated.care_notes_hi;
      if (translated.common_mistakes_hi?.length) species.common_mistakes_hi = translated.common_mistakes_hi;
      if (translated.disputed_hi) species.disputed_hi = translated.disputed_hi;
      stats.done++;
      results.dirty = true;
    } catch (err) {
      stats.failed++;
      console.error(`  ✗ ${species.id}: ${err.message.slice(0, 200)}`);
    }
    if (stats.done % SAVE_EVERY === 0 && results.dirty) {
      await save(results.allSpecies);
      results.dirty = false;
    }
    if ((stats.done + stats.failed) % 20 === 0) {
      console.log(`  ${stats.done + stats.failed}/${stats.total} (${stats.done} ok, ${stats.failed} failed)`);
    }
    const elapsed = Date.now() - start;
    if (elapsed < REQUEST_SPACING_MS) await new Promise((r) => setTimeout(r, REQUEST_SPACING_MS - elapsed));
  }
}

async function save(allSpecies) {
  await writeFile(SEED_PATH, JSON.stringify(allSpecies, null, 2) + "\n", "utf-8");
}

async function main() {
  const raw = await readFile(SEED_PATH, "utf-8");
  const allSpecies = JSON.parse(raw);

  const needsTranslation = allSpecies.filter(
    (s) => (s.care_notes || s.common_mistakes?.length || s.disputed) && !s.care_notes_hi
  );

  console.log(`${allSpecies.length} species total, ${needsTranslation.length} need Hinglish translation.`);
  if (needsTranslation.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const queue = [...needsTranslation];
  const stats = { done: 0, failed: 0, total: needsTranslation.length };
  const results = { allSpecies, dirty: false };

  await runQueue(queue, results, stats);

  await save(allSpecies);
  console.log(`Done. ${stats.done} translated, ${stats.failed} failed. Saved to ${SEED_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
