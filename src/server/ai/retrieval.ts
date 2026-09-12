import fs from "node:fs/promises";
import path from "node:path";
import * as yaml from "js-yaml";

// Retrieval — docs/03-ai-contracts.md rule 1: "retrieval first, generation
// second." Species data is real (data/species.seed.json). Corpus data
// (content/corpus/, T-004) is real too now, but empty of *reviewed* content:
// every entry ships with `status` other than "live" until a named human
// signs off (docs/05-content-guide.md §7.3) — see scripts/validate-corpus.mjs,
// which is what actually enforces that. retrieveCorpus() only ever returns
// live entries, so until review happens this correctly, honestly returns
// nothing for safety-critical questions, which is what drives the "I don't
// have grounded guidance on this yet" path rather than an improvised answer.

type SeedSpecies = {
  id: string;
  scientific_name?: string;
  common_names?: string[];
  common_names_in?: string[];
  category?: string;
  temp_c?: { min: number; max: number };
  ph?: { min: number; max: number };
  min_volume_l?: number;
  min_footprint_cm?: { length: number; width: number };
  social_min_group?: number;
  temperament?: string;
  incompatible_with?: string[];
  difficulty?: string;
};

let cachedSpecies: SeedSpecies[] | null = null;

export async function loadAllSpecies(): Promise<SeedSpecies[]> {
  if (cachedSpecies) return cachedSpecies;
  const seedPath = path.join(process.cwd(), "data", "species.seed.json");
  const raw = await fs.readFile(seedPath, "utf-8");
  cachedSpecies = JSON.parse(raw);
  return cachedSpecies!;
}

function formatSpeciesLine(s: SeedSpecies): string {
  const t = s.temp_c ? `${s.temp_c.min}-${s.temp_c.max}C` : "?";
  const ph = s.ph ? `pH ${s.ph.min}-${s.ph.max}` : "";
  const fp = s.min_footprint_cm ? `${s.min_footprint_cm.length}x${s.min_footprint_cm.width}cm min` : "";
  return `- ${s.id} | ${s.common_names?.[0] ?? s.id} | ${t} | ${ph} | ${s.min_volume_l ?? "?"}L min | ${fp} | ${s.temperament ?? ""} | incompatible: ${(s.incompatible_with ?? []).join(", ") || "none listed"}`;
}

/** Every species, one line each — ~38k tokens across the full 1,484-species catalog. Only use this when a call genuinely needs the whole catalog (e.g. /api/planner's "suggest me a community" case has its own bounded version below); prefer retrieveRelevantSpecies for anything scoped to a tank or a question. */
export async function getSpeciesContextText(): Promise<string> {
  const species = await loadAllSpecies();
  return species.map(formatSpeciesLine).join("\n");
}

/**
 * Bounded species context (2026-09-11 cost fix): instead of handing every
 * AI call the full 1,484-species catalog regardless of relevance (~38k
 * tokens on every /api/ask and /api/planner call — see the 2026-09-10 AI
 * cost audit in specs/PROGRESS.md), only pull in species that are actually
 * relevant: whatever's already in the tank (by id) plus whatever the
 * query text names or implies, using the same keyword-match technique
 * retrieveCorpus() already uses for the safety corpus. Falls back to a
 * bounded set of easy/beginner species (never the full catalog) so
 * open-ended questions like "what should I add?" still get real material
 * to reason with, just not all 1,484 entries.
 */
export async function retrieveRelevantSpecies(query: string, tankSpeciesIds: string[] = [], limit = 60): Promise<SeedSpecies[]> {
  const species = await loadAllSpecies();

  const queryWords = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

  const scored = species
    .map((s) => {
      if (queryWords.length === 0) return { s, score: 0 };
      const haystack = [s.id, s.scientific_name ?? "", ...(s.common_names ?? []), ...(s.common_names_in ?? [])].join(" ").toLowerCase();
      const score = queryWords.reduce((n, w) => n + (haystack.includes(w) ? 1 : 0), 0);
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);

  const tankSet = new Set(tankSpeciesIds);
  const inTank = species.filter((s) => tankSet.has(s.id));

  const seen = new Set<string>();
  const combined: SeedSpecies[] = [];
  for (const s of [...inTank, ...scored]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    combined.push(s);
    if (combined.length >= limit) break;
  }

  if (combined.length > 0) return combined;

  // No tank livestock and no keyword hits at all (a genuinely open-ended
  // question, e.g. "what should I add?") — a bounded beginner-friendly set
  // beats either an empty context or the full 1,484-entry dump.
  return species.filter((s) => s.difficulty === "easy").slice(0, limit);
}

export async function getSpeciesContextTextFor(list: SeedSpecies[]): Promise<string> {
  return list.map(formatSpeciesLine).join("\n");
}

/**
 * Bounded catalog for /api/planner (2026-09-11 cost fix, same audit as
 * retrieveRelevantSpecies above). The planner needs more breadth than a
 * single Ask AquaAI question — it's recommending a whole stocking plan,
 * not answering about specific fish already in a tank — so this can't
 * just be a keyword match on the wish list; it also pulls in other
 * species from the same categories (so the model still has real
 * tankmate/companion options to suggest, not just the exact fish named)
 * plus a spread of easy/beginner species as filler. Still a fraction of
 * the full 1,484-entry catalog rather than all of it on every call.
 */
export async function retrieveSpeciesForPlanner(wishList: string[], includePlants: boolean, limit = 250): Promise<SeedSpecies[]> {
  const species = await loadAllSpecies();
  const query = wishList.join(" ");

  const matched = await retrieveRelevantSpecies(query, [], species.length);
  const matchedIds = new Set(wishList.length > 0 ? matched.map((s) => s.id) : []);
  const matchedCategories = new Set(species.filter((s) => matchedIds.has(s.id)).map((s) => s.category).filter(Boolean));
  if (includePlants) matchedCategories.add("plant");
  if (matchedCategories.size === 0) {
    // No wish-list matches at all — default to the usual beginner
    // categories (fish + invertebrates, plants only for a planted tank)
    // instead of every category in the catalog.
    ["fish", "shrimp", "snail"].forEach((c) => matchedCategories.add(c));
    if (includePlants) matchedCategories.add("plant");
  }

  // 2026-09-12 bug fix: this used to sort by `difficulty === "easy"`, but the
  // real catalog values are "beginner"/"intermediate"/"advanced"/"expert" —
  // that check never matched anything, so the "easy first" sort was a
  // no-op and the list stayed in raw catalog order. With 1,331 fish vs. 134
  // plants in the catalog, the first `limit` (250) entries in that raw
  // order turned out to be 100% fish — a planted tank's AI advisor had
  // zero plant ids to ever suggest, no matter what the user picked.
  const beginnerFirst = (a: SeedSpecies, b: SeedSpecies) =>
    (a.difficulty === "beginner" ? -1 : 0) - (b.difficulty === "beginner" ? -1 : 0);

  const seen = new Set<string>();
  const combined: SeedSpecies[] = [];
  function addUpTo(rows: SeedSpecies[], cap: number) {
    let added = 0;
    for (const s of rows) {
      if (combined.length >= limit || added >= cap) break;
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      combined.push(s);
      added++;
    }
  }

  // Wish-list matches always get in, regardless of category or budget.
  addUpTo(matched.filter((s) => matchedIds.has(s.id)), matched.length);

  // Reserve real per-category budget so the much larger fish catalog can't
  // crowd out an entire required category before it ever appears — this is
  // the actual fix, not just correcting the sort. Fish gets whatever's left
  // of `limit` after plants/inverts take their reserved slice.
  if (matchedCategories.has("plant")) {
    addUpTo([...species.filter((s) => s.category === "plant")].sort(beginnerFirst), 60);
  }
  if (matchedCategories.has("shrimp") || matchedCategories.has("snail")) {
    addUpTo([...species.filter((s) => s.category === "shrimp" || s.category === "snail")].sort(beginnerFirst), 20);
  }
  if (matchedCategories.has("fish")) {
    addUpTo([...species.filter((s) => s.category === "fish")].sort(beginnerFirst), limit);
  }

  return combined;
}

export async function getSpeciesByIds(ids: string[]): Promise<SeedSpecies[]> {
  const all = await loadAllSpecies();
  const set = new Set(ids);
  return all.filter((s) => set.has(s.id));
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Post-hoc catalog match for species-id (2026-09-03 change): the model now
 * identifies fish freely from its own knowledge rather than being handed
 * our catalog and told to pick from it — so a real fish outside our 1,484
 * species can still be recognised. This is how we still link a candidate
 * back to a real Dex page when it happens to be one we carry. Scientific
 * name is checked first (least ambiguous); common name is a fallback since
 * the same common name can refer to different fish across regions.
 */
export async function matchSpeciesId(commonName: string, scientificName: string): Promise<string | null> {
  const species = await loadAllSpecies();
  const sci = normalizeName(scientificName);
  const common = normalizeName(commonName);

  if (sci) {
    const bySci = species.find((s) => s.scientific_name && normalizeName(s.scientific_name) === sci);
    if (bySci) return bySci.id;
  }

  const byCommon = species.find((s) => {
    const names = [...(s.common_names ?? []), ...(s.common_names_in ?? [])].map(normalizeName);
    return names.includes(common);
  });
  return byCommon?.id ?? null;
}

// ---- Corpus (T-004) ----

export type CorpusIndexEntry = {
  id: string;
  title: string;
  aliases: string[];
  severity: string;
  time_to_act: string;
  status: string;
  review_tier: number;
  confidence: string;
  last_reviewed_by: string;
  last_reviewed_on: string;
  review_due: string;
  applies_to: { water_type?: string[]; species_traits?: string[]; excludes?: string[] };
  body_word_count: number;
};

export type CorpusEntry = CorpusIndexEntry & {
  symptoms: string[];
  likely_causes: string[];
  immediate_actions: string[];
  do_not_do: string[];
  when_to_escalate: string | string[];
  treatments: { name: string; dose: string; duration: string; dangerous_to: string[]; notes: string; source: string }[];
  sources: string[];
  body: string;
};

export type CorpusChunk = { id: string; text: string };

let cachedIndex: CorpusIndexEntry[] | null = null;

/** The generated manifest (scripts/validate-corpus.mjs / `npm run build`) — every valid entry, live or not. */
async function loadCorpusIndex(): Promise<CorpusIndexEntry[]> {
  if (cachedIndex) return cachedIndex;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "content", "corpus.index.json"), "utf-8");
    cachedIndex = (JSON.parse(raw).entries ?? []) as CorpusIndexEntry[];
  } catch {
    // Index hasn't been generated yet (fresh checkout before the first
    // `npm run build` / `npm run corpus:validate`) — honest empty retrieval,
    // same as before T-004 shipped any content at all.
    cachedIndex = [];
  }
  return cachedIndex;
}

function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error("no frontmatter block");
  return { frontmatter: match[1], body: match[2].trim() };
}

/**
 * Full entry (frontmatter + body) for one id — used by the corpus reader
 * route and to pull body text for a retrieval hit. Works for any valid
 * entry regardless of review status; the reader can show an unreviewed
 * draft, it just won't be cited by the AI (see retrieveCorpus).
 *
 * `locale` (2026-09-12, full-app Hinglish pass): when `"hi-latn"`, tries
 * `content/corpus-hi-latn/<id>.md` first — a parallel, hand-translated set
 * of the same entries (same ids/status/review_tier/last_reviewed_by/
 * sources — only the prose is translated, so an entry's safety-review
 * status is never affected by translation). Falls back to the English
 * original whenever a Hinglish version doesn't exist yet, so a partial
 * translation rollout never breaks anything — it just serves English for
 * the not-yet-translated remainder.
 */
export async function getCorpusEntry(id: string, locale: "en" | "hi-latn" = "en"): Promise<CorpusEntry | null> {
  const safeId = id.replace(/[^a-z0-9-]/g, "");
  if (!safeId || safeId !== id) return null;
  async function readFrom(dir: string): Promise<CorpusEntry | null> {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "content", dir, `${safeId}.md`), "utf-8");
      const { frontmatter, body } = splitFrontmatter(raw);
      const data = yaml.load(frontmatter) as Record<string, unknown>;
      return { ...(data as CorpusIndexEntry), body } as CorpusEntry;
    } catch {
      return null;
    }
  }
  if (locale === "hi-latn") {
    const translated = await readFrom("corpus-hi-latn");
    if (translated) return translated;
  }
  return readFrom("corpus");
}

/**
 * Real (if simple) keyword retrieval: matches the query against each live
 * entry's id/title/aliases, ranks by match count, returns the top hits with
 * body text attached. Only `status: "live"` entries are eligible — anything
 * else has no named human reviewer yet (docs/05-content-guide.md §1, "an
 * entry with no reviewer is not eligible for retrieval — it does not ship"),
 * so it is correctly invisible to the AI even though it exists on disk and
 * the corpus reader can still show it.
 */
export async function retrieveCorpus(query: string, limit = 4, locale: "en" | "hi-latn" = "en"): Promise<CorpusChunk[]> {
  const index = await loadCorpusIndex();
  const live = index.filter((e) => e.status === "live");
  if (live.length === 0) return [];

  const queryWords = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  if (queryWords.length === 0) return [];

  const scored = live
    .map((entry) => {
      const haystack = [entry.id, entry.title, ...entry.aliases].join(" ").toLowerCase();
      const score = queryWords.reduce((n, w) => n + (haystack.includes(w) ? 1 : 0), 0);
      return { entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const chunks: CorpusChunk[] = [];
  for (const { entry } of scored) {
    const full = await getCorpusEntry(entry.id, locale);
    if (full) chunks.push({ id: full.id, text: full.body });
  }
  return chunks;
}

/**
 * Validates grounding_refs against real species/corpus ids. T-013
 * acceptance criterion 10: an unresolvable reference must be logged as an
 * error (by the caller), never silently passed through. Checked against
 * every entry that exists on disk, not just live ones — the AI itself can
 * only ever cite a live entry (retrieveCorpus only returns those), so this
 * is a belt-and-braces existence check, not a review-status check.
 */
export async function findUnresolvableRefs(refs: string[]): Promise<string[]> {
  const species = await loadAllSpecies();
  const speciesIds = new Set(species.map((s) => s.id));
  const index = await loadCorpusIndex();
  const corpusIds = new Set(index.map((e) => e.id));

  return refs.filter((ref) => {
    const [kind, id] = ref.split(":");
    if (kind === "species") return !speciesIds.has(id);
    if (kind === "corpus") return !corpusIds.has(id);
    return true; // malformed ref (no recognized "kind:" prefix)
  });
}
