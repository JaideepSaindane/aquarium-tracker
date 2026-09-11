import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { retrieveSpeciesForPlanner } from "@/server/ai/retrieval";
import { callContract } from "@/server/ai/call-contract";
import { PlannerZod, PlannerJsonSchema, PROMPT_VERSION } from "@/server/ai/schemas/planner";
import { matchCityClimate } from "@/lib/setup-recommendations";

// T-027's AI-first planner (Jaideep, 2026-09-06: "the whole point is the
// fish; think from a user lens"). One call per plan — metered like a scan
// would be, but the planner is a rare, high-intent action, so it's
// un-metered like /compat and cached by prompt hash instead. A repeated
// identical plan (same type/band/wishlist) costs once.
export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json();
  const tankType = String(body.tankType ?? "planted");
  const band = String(body.band ?? "medium");
  const city = String(body.city ?? "").trim();
  const wishList: string[] = Array.isArray(body.wishList) ? body.wishList.map(String).slice(0, 20) : [];

  const BANDS: Record<string, { label: string; minL: number; maxL: number; planL: number }> = {
    small: { label: "Small", minL: 20, maxL: 45, planL: 35 },
    medium: { label: "Medium", minL: 45, maxL: 120, planL: 75 },
    large: { label: "Large", minL: 120, maxL: 400, planL: 180 },
  };
  const bandInfo = BANDS[band] ?? BANDS.medium;
  const climate = matchCityClimate(city);
  const winterLowC = climate?.winterLowC ?? 18;

  // The catalog is the only vocabulary the model may name. Compact
  // one-line-per-species, and bounded to species relevant to this wish
  // list/tank type rather than the full 1,484-entry catalog on every call
  // (2026-09-11 cost fix — see retrieveSpeciesForPlanner) — retrieval
  // first, generation second.
  const all = await retrieveSpeciesForPlanner(wishList, tankType === "planted");
  const catalog = all
    .map((s) => {
      const t = s.temp_c ? `${s.temp_c.min}-${s.temp_c.max}C` : "?";
      const ph = s.ph ? `pH ${s.ph.min}-${s.ph.max}` : "";
      return `${s.id} | ${s.common_names?.[0] ?? s.id} | ${s.category ?? "?"} | ${t} | ${ph} | ${s.min_volume_l ?? "?"}L min | ${s.temperament ?? ""} | ${s.difficulty ?? ""}`;
    })
    .join("\n");

  const tierDescription =
    tankType === "planted"
      ? "live plants are the centrepiece; substrate and lighting for plant growth"
      : tankType === "hardscape"
        ? "rocks and driftwood aquascape, no live plants"
        : "bare-bottom, no substrate — easy cleaning, often for breeding or quarantine";

  const promptText = await loadPrompt("planner.v1.md", {
    TANK_TYPE: tankType,
    TIER_DESCRIPTION: tierDescription,
    BAND_LABEL: bandInfo.label,
    BAND_RANGE: `${bandInfo.minL}–${bandInfo.maxL}`,
    PLAN_VOLUME_L: String(bandInfo.planL),
    CITY: city || "(not given)",
    WINTER_LOW_C: String(winterLowC),
    WISH_LIST: wishList.length ? wishList.join(", ") : "(none given — suggest a good beginner community)",
    CATALOG: catalog,
  });

  const result = await callContract({
    provider: ctx.provider,
    promptText,
    promptVersion: PROMPT_VERSION,
    jsonSchema: PlannerJsonSchema,
    zodSchema: PlannerZod,
    extractGroundingRefs: (data) => [
      ...data.grounding_refs,
      ...data.suggested_fish.flatMap((f) => f.grounding_refs),
      ...data.suggested_plants.flatMap((p) => p.grounding_refs),
      ...data.stocking_notes.flatMap((n) => n.grounding_refs),
    ],
  });

  if (!result.ok) return NextResponse.json({ error: result.error, detail: result.detail }, { status: 422 });
  if (result.unresolvableRefs.length) console.error(`[${PROMPT_VERSION}] unresolvable grounding_refs:`, result.unresolvableRefs);

  return NextResponse.json({ plan: result.data, meta: result.meta, unresolvableRefs: result.unresolvableRefs });
}
