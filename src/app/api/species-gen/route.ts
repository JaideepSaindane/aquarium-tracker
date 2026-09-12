import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { checkIpRateLimit } from "@/server/ai/ip-rate-limit";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { callContract } from "@/server/ai/call-contract";
import { SpeciesGenZod, SpeciesGenJsonSchema, PROMPT_VERSION } from "@/server/ai/schemas/species-gen";
import { hashPrompt, getCached, setCached } from "@/server/ai/cache";
import type { z } from "zod";

// Unlimited and uncounted, cached by query — Principle 03: a missing
// species is never a dead end.
export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const rate = await checkIpRateLimit(req);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const body = await req.json();
  const query = String(body.query ?? "").trim();
  if (!query) return NextResponse.json({ error: "No species name given." }, { status: 400 });

  const promptText = await loadPrompt("species-gen.v1.md", { QUERY: query });

  const hash = hashPrompt(PROMPT_VERSION, promptText);
  const cached = await getCached<z.infer<typeof SpeciesGenZod>>(hash);
  if (cached) return NextResponse.json({ speciesGen: cached, meta: { cacheHit: true } });

  const result = await callContract({
    provider: ctx.provider,
    promptText,
    promptVersion: PROMPT_VERSION,
    jsonSchema: SpeciesGenJsonSchema,
    zodSchema: SpeciesGenZod,
    extractGroundingRefs: () => [], // this contract generates a new species card; it doesn't cite existing ones
  });

  if (!result.ok) return NextResponse.json({ error: result.error, detail: result.detail }, { status: 422 });

  await setCached(hash, result.data);
  return NextResponse.json({ speciesGen: result.data, meta: { ...result.meta, cacheHit: false } });
}
