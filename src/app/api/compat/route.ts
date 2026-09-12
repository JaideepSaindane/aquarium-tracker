import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { checkIpRateLimit } from "@/server/ai/ip-rate-limit";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { getSpeciesByIds, getSpeciesContextText } from "@/server/ai/retrieval";
import { callContract } from "@/server/ai/call-contract";
import { CompatZod, CompatJsonSchema, PROMPT_VERSION } from "@/server/ai/schemas/compat";
import { hashPrompt, getCached, setCached } from "@/server/ai/cache";
import type { z } from "zod";

// Unlimited and uncounted (fires on every livestock add) — heavily cached,
// which is what makes that affordable. See specs/T-013 and Principle 01:
// this must never block a save regardless of verdict.
export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const rate = await checkIpRateLimit(req);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const body = await req.json();
  const lengthCm = Number(body.lengthCm);
  const widthCm = Number(body.widthCm);
  const heightCm = Number(body.heightCm);
  const existingSpeciesIds: string[] = body.existingSpeciesIds ?? [];
  const newSpeciesIds: string[] = body.newSpeciesIds ?? [];
  if (!lengthCm || !widthCm || !heightCm || newSpeciesIds.length === 0) {
    return NextResponse.json({ error: "Missing tank dimensions or species being added." }, { status: 400 });
  }
  const volumeL = Math.round(((lengthCm * widthCm * heightCm) / 1000) * 10) / 10;

  const relevantSpecies = await getSpeciesByIds([...existingSpeciesIds, ...newSpeciesIds]);
  const promptText = await loadPrompt("compat.v1.md", {
    LENGTH_CM: String(lengthCm),
    WIDTH_CM: String(widthCm),
    HEIGHT_CM: String(heightCm),
    VOLUME_L: String(volumeL),
    EXISTING_LIVESTOCK: existingSpeciesIds.join(", ") || "(none yet)",
    NEW_SPECIES: newSpeciesIds.join(", "),
    SPECIES_CONTEXT: relevantSpecies.length ? JSON.stringify(relevantSpecies, null, 2) : await getSpeciesContextText(),
  });

  const hash = hashPrompt(PROMPT_VERSION, promptText);
  const cached = await getCached<z.infer<typeof CompatZod>>(hash);
  if (cached) {
    return NextResponse.json({ compat: cached, meta: { cacheHit: true } });
  }

  const result = await callContract({
    provider: ctx.provider,
    promptText,
    promptVersion: PROMPT_VERSION,
    jsonSchema: CompatJsonSchema,
    zodSchema: CompatZod,
    extractGroundingRefs: (data) => [...data.grounding_refs, ...data.conflicts.flatMap((c) => c.grounding_refs)],
  });

  if (!result.ok) return NextResponse.json({ error: result.error, detail: result.detail }, { status: 422 });
  if (result.unresolvableRefs.length) console.error(`[${PROMPT_VERSION}] unresolvable grounding_refs:`, result.unresolvableRefs);

  await setCached(hash, result.data);
  return NextResponse.json({ compat: result.data, meta: { ...result.meta, cacheHit: false }, unresolvableRefs: result.unresolvableRefs });
}
