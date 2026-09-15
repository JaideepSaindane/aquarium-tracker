import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Serves data/species.seed.json to the browser so it can seed the local
// species table on first boot (see src/db/DbBootProvider.tsx) — not
// duplicated into public/ since the seed file's home stays data/, governed
// by data/README.md. This is a real production route, not a dev-only tool
// (moved out of /api/dev/ where it originally lived during T-011 testing —
// the app genuinely needs this on every real user's first launch).
const SEED_FIELDS = [
  "id", "scientific_name", "common_names", "common_names_in", "category", "verified", "source_refs",
  "temp_c", "ph", "hardness_dgh", "adult_size_cm", "min_volume_l", "min_footprint_cm", "social_min_group",
  "temperament", "swim_level", "diet", "difficulty", "lifespan_years", "breeding", "care_notes",
  "common_mistakes", "incompatible_with", "disputed", "care_notes_hi", "common_mistakes_hi", "disputed_hi",
  "dex", "image", "uncertainty_note",
];

export async function GET() {
  const seedPath = path.join(process.cwd(), "data", "species.seed.json");
  const raw = await fs.readFile(seedPath, "utf-8");
  // Only the fields seedSpecies() reads — the seed file also carries image
  // provenance, GBIF/iNaturalist match data etc. (most of its ~6 MB) that
  // the browser never uses.
  const slim = (JSON.parse(raw) as Record<string, unknown>[]).map((s) => {
    const out: Record<string, unknown> = {};
    for (const k of SEED_FIELDS) if (s[k] !== undefined) out[k] = s[k];
    return out;
  });
  return NextResponse.json(slim, {
    // The catalog is identical for every user and only changes on a
    // deploy, but this route sits behind the sign-in gate (src/proxy.ts) —
    // `private` keeps caching to the requesting browser only, since a
    // shared/CDN cache here could serve a cached response to a later
    // unauthenticated request without middleware ever re-checking the
    // session. `must-revalidate` still checks freshness after 1 day
    // rather than serving indefinitely-stale data past that window.
    headers: { "Cache-Control": "private, max-age=86400, must-revalidate" },
  });
}
