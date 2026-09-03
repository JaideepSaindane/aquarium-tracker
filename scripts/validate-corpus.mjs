// Validates every content/corpus/*.md entry against the schema in
// docs/05-content-guide.md §3, and generates content/corpus.index.json — the
// manifest src/server/ai/retrieval.ts loads for retrieval (T-013) and the
// corpus reader route resolves ids against (T-004). Node/build-time only.
//
// Run directly: node scripts/validate-corpus.mjs
// Wired into `npm run build` so a broken or unreviewed-but-marked-live entry
// fails the build rather than shipping quietly (specs/T-004-content-corpus.md
// acceptance criteria 3–4).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const root = path.dirname(fileURLToPath(import.meta.url));
const corpusDir = path.join(root, "..", "content", "corpus");
const traitsPath = path.join(root, "..", "content", "schema", "traits.yml");
const outPath = path.join(root, "..", "content", "corpus.index.json");

const SEVERITY = ["low", "medium", "high", "critical"];
const TIME_TO_ACT = ["now", "24h", "72h", "1w", "routine"];
const CONFIDENCE = ["high", "medium", "contested"];
const STATUS = ["draft", "sourced", "peer_reviewed", "expert_reviewed", "live", "stale"];
const REVIEW_TIER = [1, 2, 3];
const REQUIRED_FIELDS = [
  "id",
  "title",
  "status",
  "review_tier",
  "aliases",
  "severity",
  "time_to_act",
  "applies_to",
  "symptoms",
  "likely_causes",
  "immediate_actions",
  "do_not_do",
  "when_to_escalate",
  "treatments",
  "sources",
  "confidence",
  "last_reviewed_by",
  "last_reviewed_on",
  "review_due",
];

function splitFrontmatter(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${file}: no frontmatter block found (must start with "---" and close with "---")`);
  return { frontmatter: match[1], body: match[2].trim() };
}

function loadTraits() {
  const doc = yaml.load(fs.readFileSync(traitsPath, "utf-8"));
  if (!doc || !Array.isArray(doc.traits)) throw new Error(`${traitsPath}: expected a top-level "traits" list`);
  return new Set(doc.traits);
}

function validateEntry(file, data, knownTraits, errors) {
  const tag = (msg) => errors.push(`${file}: ${msg}`);

  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null) tag(`missing required field "${field}"`);
  }
  if (errors.some((e) => e.startsWith(file))) return; // don't cascade into type errors below on a badly-shaped file

  const idFromFilename = path.basename(file, ".md");
  if (data.id !== idFromFilename) tag(`frontmatter id "${data.id}" does not match filename (expected "${idFromFilename}")`);

  if (!SEVERITY.includes(data.severity)) tag(`severity "${data.severity}" not one of ${SEVERITY.join(" | ")}`);
  if (!TIME_TO_ACT.includes(data.time_to_act)) tag(`time_to_act "${data.time_to_act}" not one of ${TIME_TO_ACT.join(" | ")}`);
  if (!CONFIDENCE.includes(data.confidence)) tag(`confidence "${data.confidence}" not one of ${CONFIDENCE.join(" | ")}`);
  if (!STATUS.includes(data.status)) tag(`status "${data.status}" not one of ${STATUS.join(" | ")}`);
  if (!REVIEW_TIER.includes(data.review_tier)) tag(`review_tier ${data.review_tier} not one of ${REVIEW_TIER.join(" | ")}`);

  if (!Array.isArray(data.aliases) || data.aliases.length < 5) tag(`aliases must be a list of at least 5 (docs/05-content-guide.md §3 field definitions)`);

  const traits = data.applies_to?.species_traits ?? [];
  for (const t of traits) {
    if (!knownTraits.has(t)) tag(`applies_to.species_traits has unknown trait "${t}" — add it to content/schema/traits.yml first`);
  }

  for (const url of data.sources ?? []) {
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) tag(`sources[] entry "${url}" is not a URL`);
  }

  for (const [i, t] of (data.treatments ?? []).entries()) {
    if (!t.dangerous_to || (Array.isArray(t.dangerous_to) && t.dangerous_to.length === 0)) {
      tag(`treatments[${i}] ("${t.name ?? "unnamed"}") has an empty dangerous_to — write [none_known] explicitly if that's genuinely true, per docs/05-content-guide.md §3`);
    }
    if (t.source && !/^https?:\/\//.test(t.source)) tag(`treatments[${i}] source "${t.source}" is not a URL`);
  }

  // The build-blocking rule this validator exists to enforce (acceptance
  // criterion 4): an entry cannot be marked live without a real reviewer.
  if (data.status === "live" && !String(data.last_reviewed_by ?? "").trim()) {
    tag(`status is "live" but last_reviewed_by is empty — an entry cannot ship live without a named human reviewer (docs/05-content-guide.md §7.3)`);
  }
}

function main() {
  const knownTraits = loadTraits();
  const files = fs.existsSync(corpusDir) ? fs.readdirSync(corpusDir).filter((f) => f.endsWith(".md")) : [];

  const errors = [];
  const entries = [];
  const seenIds = new Map();

  for (const file of files) {
    const full = path.join(corpusDir, file);
    const raw = fs.readFileSync(full, "utf-8");
    let frontmatter, body;
    try {
      ({ frontmatter, body } = splitFrontmatter(raw, file));
    } catch (err) {
      errors.push(err.message);
      continue;
    }
    let data;
    try {
      data = yaml.load(frontmatter);
    } catch (err) {
      errors.push(`${file}: invalid YAML frontmatter — ${err.message}`);
      continue;
    }
    validateEntry(file, data, knownTraits, errors);
    if (errors.some((e) => e.startsWith(file))) continue;

    if (seenIds.has(data.id)) {
      errors.push(`${file}: id "${data.id}" is already used by ${seenIds.get(data.id)} — ids must be unique`);
      continue;
    }
    seenIds.set(data.id, file);

    entries.push({
      id: data.id,
      title: data.title,
      aliases: data.aliases,
      severity: data.severity,
      time_to_act: data.time_to_act,
      status: data.status,
      review_tier: data.review_tier,
      confidence: data.confidence,
      last_reviewed_by: data.last_reviewed_by,
      last_reviewed_on: data.last_reviewed_on,
      review_due: data.review_due,
      applies_to: data.applies_to ?? {},
      body_word_count: body.split(/\s+/).filter(Boolean).length,
    });
  }

  if (errors.length > 0) {
    console.error(`Corpus validation FAILED — ${errors.length} problem(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2) + "\n");

  const live = entries.filter((e) => e.status === "live").length;
  console.log(`Corpus validation passed: ${entries.length} entr${entries.length === 1 ? "y" : "ies"}, ${live} live (retrievable by the AI), ${entries.length - live} not yet reviewed.`);
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
}

main();
