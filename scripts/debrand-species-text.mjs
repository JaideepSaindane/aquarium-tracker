// One-time fix (2026-09-15, Jaideep: "This is pure bullshit - I dont want
// names. I cannot be promoting these brands.") — several species' care_notes/
// disputed/common_mistakes text named specific third-party sources
// ("Seriously Fish says...", "Aquarium Co-Op recommends...") inline in
// user-facing prose. source_refs (the URL list) is untouched — that's
// internal provenance metadata, never rendered in the app UI. This only
// rewrites the actual displayed sentences to state the fact plainly
// without brand-naming it, in both English and the Hinglish _hi fields.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SEED_PATH = path.join(process.cwd(), "data", "species.seed.json");
const MODEL_NAME = "gemini-3.5-flash-lite";
const REQUEST_SPACING_MS = 4500;
const API_KEY = process.env.GEMINI_API_KEY;
const BRAND_PATTERN = /Seriously Fish|Aquarium Co-Op|AquariumCoOp|Aquarium Coop|Practical Fishkeeping|Fishlore|PetSmart|Petco|Tropical Fish Hobbyist|Live ?Aquaria|Bettafish\.com|The Spruce Pets|Fishkeeping World|Aquarium Source/i;

if (!API_KEY) {
  console.error("GEMINI_API_KEY not set — run with: node --env-file=.env.local scripts/debrand-species-text.mjs");
  process.exit(1);
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    care_notes: { type: "string" },
    disputed: { type: "string" },
    common_mistakes: { type: "array", items: { type: "string" } },
    care_notes_hi: { type: "string" },
    disputed_hi: { type: "string" },
    common_mistakes_hi: { type: "array", items: { type: "string" } },
  },
  required: [],
};

function buildPrompt(s) {
  const parts = [
    `Rewrite the following freshwater-aquarium care text for "${s.common_names?.[0] ?? s.id}" to remove every mention of a specific third-party brand or website name (e.g. "Seriously Fish", "Aquarium Co-Op") while keeping every actual fact, number, and range exactly as given. State the fact plainly instead of attributing it — e.g. "Aquarium Co-Op recommends around 27°C" becomes "around 27°C is commonly recommended", and "Seriously Fish gives 22-30°C" becomes "the tolerated range is commonly cited as 22-30°C". If two sources disagree, say "sources disagree" or "commonly cited... vs..." instead of naming which source said what. Do not change any other content, and do not add new information. Only rewrite a field if it's given below; leave the JSON key out entirely if not given.`,
  ];
  if (BRAND_PATTERN.test(s.care_notes ?? "")) parts.push(`\ncare_notes (English):\n${s.care_notes}`);
  if (BRAND_PATTERN.test(s.disputed ?? "")) parts.push(`\ndisputed (English):\n${s.disputed}`);
  if ((s.common_mistakes ?? []).some((m) => BRAND_PATTERN.test(m))) parts.push(`\ncommon_mistakes (English, one per line):\n${s.common_mistakes.join("\n")}`);
  if (BRAND_PATTERN.test(s.care_notes_hi ?? "")) parts.push(`\ncare_notes_hi (Hinglish — rewrite the same way, staying in Hinglish/Latin script):\n${s.care_notes_hi}`);
  if (BRAND_PATTERN.test(s.disputed_hi ?? "")) parts.push(`\ndisputed_hi (Hinglish):\n${s.disputed_hi}`);
  if ((s.common_mistakes_hi ?? []).some((m) => BRAND_PATTERN.test(m))) parts.push(`\ncommon_mistakes_hi (Hinglish, one per line):\n${s.common_mistakes_hi.join("\n")}`);
  return parts.join("\n");
}

async function callGemini(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
  const body = { contents: [{ parts: [{ text: promptText }] }], generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, maxOutputTokens: 2048 } };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in response");
  return JSON.parse(text);
}

async function main() {
  const raw = await readFile(SEED_PATH, "utf-8");
  const allSpecies = JSON.parse(raw);

  const affected = allSpecies.filter(
    (s) =>
      BRAND_PATTERN.test(s.care_notes ?? "") ||
      BRAND_PATTERN.test(s.disputed ?? "") ||
      (s.common_mistakes ?? []).some((m) => BRAND_PATTERN.test(m)) ||
      BRAND_PATTERN.test(s.care_notes_hi ?? "") ||
      BRAND_PATTERN.test(s.disputed_hi ?? "") ||
      (s.common_mistakes_hi ?? []).some((m) => BRAND_PATTERN.test(m))
  );

  console.log(`${affected.length} species mention a brand name in user-facing text.`);
  let done = 0;
  let failed = 0;
  for (const s of affected) {
    try {
      const rewritten = await callGemini(buildPrompt(s));
      if (rewritten.care_notes) s.care_notes = rewritten.care_notes;
      if (rewritten.disputed) s.disputed = rewritten.disputed;
      if (rewritten.common_mistakes?.length) s.common_mistakes = rewritten.common_mistakes;
      if (rewritten.care_notes_hi) s.care_notes_hi = rewritten.care_notes_hi;
      if (rewritten.disputed_hi) s.disputed_hi = rewritten.disputed_hi;
      if (rewritten.common_mistakes_hi?.length) s.common_mistakes_hi = rewritten.common_mistakes_hi;
      done++;
      console.log(`  ✓ ${s.id}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${s.id}: ${err.message.slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, REQUEST_SPACING_MS));
  }

  await writeFile(SEED_PATH, JSON.stringify(allSpecies, null, 2) + "\n", "utf-8");
  console.log(`Done. ${done} fixed, ${failed} failed. Saved.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
