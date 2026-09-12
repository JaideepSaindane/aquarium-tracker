import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { checkIpRateLimit } from "@/server/ai/ip-rate-limit";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { matchSpeciesId } from "@/server/ai/retrieval";
import { callContract } from "@/server/ai/call-contract";
import { SpeciesIdZod, SpeciesIdJsonSchema, PROMPT_VERSION } from "@/server/ai/schemas/species-id";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Unlimited, uncounted — the "I don't know this fish" assist from T-016.
// Not cached (a photo is effectively unique per call, unlike a compat
// question), but cheap per specs/T-013's cost table.
export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  if (!ctx.isByok) {
    const rate = await checkIpRateLimit(req);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  const form = await req.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) return NextResponse.json({ error: "No photo uploaded." }, { status: 400 });
  if (photo.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Photo is too large." }, { status: 400 });

  const imageBuffer = Buffer.from(await photo.arrayBuffer());
  // No catalog handed to the model any more (2026-09-03) — it identifies
  // freely from its own knowledge, so a real fish outside our 1,484 species
  // can still be recognised instead of being forced toward the nearest
  // catalog match. See matchSpeciesId() below for how we still link back
  // to a real Dex page when the identified species happens to be one we carry.
  const promptText = await loadPrompt("species-id.v2.md", {});

  const result = await callContract({
    provider: ctx.provider,
    promptText,
    promptVersion: PROMPT_VERSION,
    jsonSchema: SpeciesIdJsonSchema,
    zodSchema: SpeciesIdZod,
    image: { base64: imageBuffer.toString("base64"), mimeType: photo.type || "image/jpeg" },
    extractGroundingRefs: () => [],
  });

  if (!result.ok) return NextResponse.json({ error: result.error, detail: result.detail }, { status: 422 });

  const candidates = await Promise.all(
    result.data.candidates.map(async (c) => ({
      ...c,
      species_id: await matchSpeciesId(c.common_name, c.scientific_name),
    }))
  );

  return NextResponse.json({ speciesId: { ...result.data, candidates }, meta: result.meta });
}
