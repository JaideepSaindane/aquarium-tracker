// Phase 2 of the 2026-09-16 data-quality pass: cross-check every fish in
// data/species.seed.json against FishBase's own species summary page.
//
// Reads only /summary/<Genus>-<species>.html, which robots.txt allows, at one
// request per 10s (its Crawl-delay) with a descriptive user agent. Writes
// nothing to the seed file itself — it produces a report at
// /tmp/fishbase-report.json so the numbers can be reviewed before any of them
// replace ours. FishBase ranges are literature/wild-habitat values, not
// aquarium recommendations, so they are evidence, not a straight overwrite.
//
// Run: node scripts/crosscheck-fishbase.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SEED = path.join(process.cwd(), "data", "species.seed.json");
const OUT = "/tmp/fishbase-report.json";
const DELAY_MS = 10_000; // FishBase robots.txt Crawl-delay
const UA = "AquaAI/1.0 (aquarium care app; data cross-check; jaideep.saindane@gmail.com)";

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function parse(html) {
  const t = textOf(html);
  const out = {};
  const len = t.match(/Max length\s*:\s*([\d.]+)\s*cm/i);
  if (len) out.maxLengthCm = Number(len[1]);
  const ph = t.match(/pH range:\s*([\d.]+)\s*-\s*([\d.]+)/i);
  if (ph) out.ph = { min: Number(ph[1]), max: Number(ph[2]) };
  const dh = t.match(/dH range:\s*([\d.]+)\s*-\s*([\d.]+)/i);
  if (dh) out.dh = { min: Number(dh[1]), max: Number(dh[2]) };
  // "Tropical; 24°C - 30°C (Ref. 1672)" — degree signs arrive as &deg; before
  // entity decoding, so match either form.
  const temp = t.match(/([\d.]+)\s*(?:°|&deg;)\s*C?\s*-\s*([\d.]+)\s*(?:°|&deg;)\s*C/i);
  if (temp) out.tempC = { min: Number(temp[1]), max: Number(temp[2]) };
  const climate = t.match(/\b(Tropical|Subtropical|Temperate|Boreal|Polar)\b/);
  if (climate) out.climate = climate[1];
  if (/\bFreshwater\b/i.test(t)) out.freshwater = true;
  if (/\bbrackish\b/i.test(t)) out.brackish = true;
  if (/\bmarine\b/i.test(t)) out.marine = true;
  const fam = t.match(/Family:?\s*([A-Z][a-z]+idae)/);
  if (fam) out.family = fam[1];
  return out;
}

const all = JSON.parse(await readFile(SEED, "utf-8"));
const fish = all.filter((s) => s.category !== "plant" && s.scientific_name && /^[A-Z][a-z]+ [a-z-]+$/.test(s.scientific_name));
console.log(`${fish.length} species with a binomial name to check (of ${all.length}).`);

const report = [];
let hits = 0;
let misses = 0;
for (const [i, s] of fish.entries()) {
  const slug = s.scientific_name.trim().replace(/\s+/g, "-");
  const url = `https://fishbase.se/summary/${slug}.html`;
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
    if (res.ok) {
      const parsed = parse(await res.text());
      if (Object.keys(parsed).length > 0) {
        hits++;
        report.push({ id: s.id, scientific_name: s.scientific_name, url, fishbase: parsed, ours: { temp_c: s.temp_c, ph: s.ph, hardness_dgh: s.hardness_dgh, adult_size_cm: s.adult_size_cm, family: s.family } });
      } else {
        misses++;
        report.push({ id: s.id, scientific_name: s.scientific_name, url, error: "no fields parsed" });
      }
    } else {
      misses++;
      report.push({ id: s.id, scientific_name: s.scientific_name, url, error: `HTTP ${res.status}` });
    }
  } catch (e) {
    misses++;
    report.push({ id: s.id, scientific_name: s.scientific_name, url, error: String(e.message).slice(0, 120) });
  }
  if ((i + 1) % 25 === 0) {
    await writeFile(OUT, JSON.stringify(report, null, 2));
    console.log(`  ${i + 1}/${fish.length} (${hits} with data, ${misses} without)`);
  }
  const wait = DELAY_MS - (Date.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}
await writeFile(OUT, JSON.stringify(report, null, 2));
console.log(`Done. ${hits} with data, ${misses} without. Report: ${OUT}`);
