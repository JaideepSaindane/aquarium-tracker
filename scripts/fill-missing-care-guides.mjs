// One-time fill (2026-09-16, Jaideep): 313 species had no care guide.
// Drafts care_notes + common_mistakes (English and Hinglish) and fills any
// missing temperament/diet/difficulty/swim level/group size/adult size/min
// tank volume. Existing values are never overwritten. Every filled species is
// labelled with the same "drafted, not checked" uncertainty note the catalog
// already uses. Resumable: skips species that already have care_notes.
//
// Run: node --env-file=.env.local scripts/fill-missing-care-guides.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SEED_PATH = path.join(process.cwd(), "data", "species.seed.json");
const MODEL = "gemini-3.5-flash-lite";
const SPACING_MS = 4500;
const SAVE_EVERY = 20;
const KEY = process.env.GEMINI_API_KEY;
const NOTE = "Drafted from general aquarium-hobby knowledge, not yet checked against a named source.";
if (!KEY) throw new Error("GEMINI_API_KEY not set");

const str = { type: "string" };
const SCHEMA = {
  type: "object",
  properties: {
    care_notes: str,
    common_mistakes: { type: "array", items: str },
    care_notes_hi: str,
    common_mistakes_hi: { type: "array", items: str },
    temperament: { type: "string", enum: ["peaceful", "semi-aggressive", "aggressive", "territorial"] },
    diet: { type: "string", enum: ["omnivore", "carnivore", "herbivore", "algae-grazer", "insectivore"] },
    difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"] },
    swim_level: { type: "string", enum: ["top", "mid", "bottom", "all"] },
    social_min_group: { type: "number" },
    adult_size_cm: { type: "number" },
    min_volume_l: { type: "number" },
  },
  required: ["care_notes", "common_mistakes", "care_notes_hi", "common_mistakes_hi"],
};

function prompt(s) {
  const name = s.common_names?.[0] ?? s.id;
  const known = {
    category: s.category,
    temp_c: s.temp_c,
    ph: s.ph,
    hardness_dgh: s.hardness_dgh,
    temperament: s.temperament,
    diet: s.diet,
    difficulty: s.difficulty,
    adult_size_cm: s.adult_size_cm,
    min_volume_l: s.min_volume_l,
    social_min_group: s.social_min_group,
  };
  return `Write a short freshwater-aquarium care guide for "${name}" (${s.scientific_name}), a ${s.category}.

Known data (keep consistent with it, don't contradict these numbers): ${JSON.stringify(known)}

Rules:
- care_notes: 3-4 short, plain-English sentences a beginner can act on — the most important care points (water, tank size/group, diet, tankmates, one key tip). Give numbers with units (°C, L, cm). No filler.
- common_mistakes: 4-5 short items (max ~12 words each), the real mistakes keepers make with this ${s.category}.
- care_notes_hi / common_mistakes_hi: the same content in natural spoken Hinglish (Latin script, not Devanagari). Keep species names, chemical terms (pH, dGH, ammonia) and units in English.
- Never name any website, shop, brand or source.
- For plants: care is about light, CO2/fertiliser, substrate, trimming; set temperament/diet/swim_level/social_min_group/min_volume_l only if meaningful, else omit.
- Also give temperament, diet, difficulty, swim_level, social_min_group, adult_size_cm, min_volume_l (litres) with your best typical values for this species.
- If genuinely unsure of a number, give the common hobby range rather than inventing precision.
Return JSON only.`;
}

async function draft(s) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = { contents: [{ parts: [{ text: prompt(s) }] }], generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, maxOutputTokens: 2048 } };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
    if (res.ok) {
      const d = await res.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return JSON.parse(text);
    } else if (attempt === 4) {
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  throw new Error("no response");
}

const all = JSON.parse(await readFile(SEED_PATH, "utf-8"));
const todo = all.filter((s) => !s.care_notes);
console.log(`${todo.length} species need a care guide.`);
let done = 0;
let failed = 0;
for (const s of todo) {
  const start = Date.now();
  try {
    const r = await draft(s);
    s.care_notes = r.care_notes;
    s.common_mistakes = r.common_mistakes;
    s.care_notes_hi = r.care_notes_hi;
    s.common_mistakes_hi = r.common_mistakes_hi;
    for (const k of ["temperament", "diet", "difficulty", "swim_level", "social_min_group", "adult_size_cm", "min_volume_l"]) {
      if ((s[k] === undefined || s[k] === null || s[k] === "") && r[k] !== undefined && r[k] !== null && r[k] !== "") s[k] = r[k];
    }
    if (!s.uncertainty_note) s.uncertainty_note = NOTE;
    done++;
  } catch (e) {
    failed++;
    console.error(`  ✗ ${s.id}: ${String(e.message).slice(0, 160)}`);
  }
  if ((done + failed) % SAVE_EVERY === 0) {
    await writeFile(SEED_PATH, JSON.stringify(all, null, 2) + "\n");
    console.log(`  ${done + failed}/${todo.length} (${done} ok, ${failed} failed)`);
  }
  const wait = SPACING_MS - (Date.now() - start);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}
await writeFile(SEED_PATH, JSON.stringify(all, null, 2) + "\n");
console.log(`Done. ${done} filled, ${failed} failed.`);
