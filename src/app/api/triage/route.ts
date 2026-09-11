import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { retrieveCorpus } from "@/server/ai/retrieval";
import { callContract } from "@/server/ai/call-contract";
import { TriageZod, TriageJsonSchema, PROMPT_VERSION } from "@/server/ai/schemas/triage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Free forever, unlimited, never rate-limited — Principle 02. No quota
// check here at all, deliberately (see specs/T-013).
export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const form = await req.formData();
  const photo = form.get("photo");
  const description = String(form.get("description") ?? "");
  const affectedCount = String(form.get("affected_count") ?? "unknown");
  const duration = String(form.get("duration") ?? "unknown");
  const recentTest = String(form.get("recent_test") ?? "none provided");
  const tankAgeDays = String(form.get("tank_age_days") ?? "unknown");

  if (!description.trim()) return NextResponse.json({ error: "Describe what's happening first." }, { status: 400 });

  let image: { base64: string; mimeType: string } | undefined;
  if (photo instanceof File) {
    if (photo.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Photo is too large." }, { status: 400 });
    const buffer = Buffer.from(await photo.arrayBuffer());
    image = { base64: buffer.toString("base64"), mimeType: photo.type || "image/jpeg" };
  }

  const corpus = await retrieveCorpus(description);
  const promptText = await loadPrompt("triage.v2.md", {
    DESCRIPTION: description,
    AFFECTED_COUNT: affectedCount,
    DURATION: duration,
    RECENT_TEST: recentTest,
    TANK_AGE_DAYS: tankAgeDays,
    CORPUS_CONTEXT: corpus.length ? corpus.map((c) => `[${c.id}]\n${c.text}`).join("\n\n") : "(none retrieved yet)",
  });

  const result = await callContract({
    provider: ctx.provider,
    promptText,
    promptVersion: PROMPT_VERSION,
    jsonSchema: TriageJsonSchema,
    zodSchema: TriageZod,
    image,
    extractGroundingRefs: (data) => [
      ...data.grounding_refs,
      ...data.hypotheses.flatMap((h) => h.grounding_refs),
      ...data.conditional_guidance.flatMap((c) => c.grounding_refs),
    ],
  });

  if (!result.ok) return NextResponse.json({ error: result.error, detail: result.detail }, { status: 422 });
  if (result.unresolvableRefs.length) console.error(`[${PROMPT_VERSION}] unresolvable grounding_refs:`, result.unresolvableRefs);

  return NextResponse.json({ triage: result.data, meta: result.meta, unresolvableRefs: result.unresolvableRefs });
}
