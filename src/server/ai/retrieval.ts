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
};

let cachedSpecies: SeedSpecies[] | null = null;

export async function loadAllSpecies(): Promise<SeedSpecies[]> {
  if (cachedSpecies) return cachedSpecies;
  const seedPath = path.join(process.cwd(), "data", "species.seed.json");
  const raw = await fs.readFile(seedPath, "utf-8");
  cachedSpecies = JSON.parse(raw);
  return cachedSpecies!;
}

export async function getSpeciesContextText(): Promise<string> {
  const species = await loadAllSpecies();
  return species
    .map((s) => {
      const t = s.temp_c ? `${s.temp_c.min}-${s.temp_c.max}C` : "?";
      const ph = s.ph ? `pH ${s.ph.min}-${s.ph.max}` : "";
      const fp = s.min_footprint_cm ? `${s.min_footprint_cm.length}x${s.min_footprint_cm.width}cm min` : "";
      return `- ${s.id} | ${s.common_names?.[0] ?? s.id} | ${t} | ${ph} | ${s.min_volume_l ?? "?"}L min | ${fp} | ${s.temperament ?? ""} | incompatible: ${(s.incompatible_with ?? []).join(", ") || "none listed"}`;
    })
    .join("\n");
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
 * our catalog and told to pick from it — so a real fish outside our 445
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

/** Full entry (frontmatter + body) for one id — used by the corpus reader route and to pull body text for a retrieval hit. Works for any valid entry regardless of review status; the reader can show an unreviewed draft, it just won't be cited by the AI (see retrieveCorpus). */
export async function getCorpusEntry(id: string): Promise<CorpusEntry | null> {
  const safeId = id.replace(/[^a-z0-9-]/g, "");
  if (!safeId || safeId !== id) return null;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "content", "corpus", `${safeId}.md`), "utf-8");
    const { frontmatter, body } = splitFrontmatter(raw);
    const data = yaml.load(frontmatter) as Record<string, unknown>;
    return { ...(data as CorpusIndexEntry), body } as CorpusEntry;
  } catch {
    return null;
  }
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
export async function retrieveCorpus(query: string, limit = 4): Promise<CorpusChunk[]> {
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
    const full = await getCorpusEntry(entry.id);
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
