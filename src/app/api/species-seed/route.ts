import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Serves data/species.seed.json to the browser so it can seed the local
// species table on first boot (see src/db/DbBootProvider.tsx) — not
// duplicated into public/ since the seed file's home stays data/, governed
// by data/README.md. This is a real production route, not a dev-only tool
// (moved out of /api/dev/ where it originally lived during T-011 testing —
// the app genuinely needs this on every real user's first launch).
export async function GET() {
  const seedPath = path.join(process.cwd(), "data", "species.seed.json");
  const raw = await fs.readFile(seedPath, "utf-8");
  return NextResponse.json(JSON.parse(raw), {
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
