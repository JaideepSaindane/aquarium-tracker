import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { checkIpRateLimit } from "@/server/ai/ip-rate-limit";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { callContract } from "@/server/ai/call-contract";
import { HealthCheckZod, HealthCheckJsonSchema, PROMPT_VERSION, deriveOverallStatus, type HealthCheckReport } from "@/server/ai/schemas/health-check";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Free forever, unlimited, no quota — a health check is squarely
// "advise, never block" (Principle 01/02) territory, same footing as
// Emergency Triage. Still IP-rate-limited (2026-09-12 security review
// pattern) since it's a real Gemini call and phone+PIN sign-up has no
// verification.
export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const rate = await checkIpRateLimit(req);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const form = await req.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) return NextResponse.json({ error: "No photo uploaded." }, { status: 400 });
  if (photo.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Photo is too large." }, { status: 400 });

  const lengthCm = Number(form.get("length_cm") ?? 0);
  const widthCm = Number(form.get("width_cm") ?? 0);
  const heightCm = Number(form.get("height_cm") ?? 0);
  const volumeL = Math.round(((lengthCm * widthCm * heightCm) / 1000) * 10) / 10;
  const tankType = String(form.get("tank_type") ?? "unclear");
  const tankRecord = String(form.get("tank_record") ?? "(no existing record)");
  const locale = form.get("locale") === "hi-latn" ? "hi-latn" : "en";
  const replyLanguage = locale === "hi-latn" ? "Hinglish (Latin script)" : "English";

  const imageBuffer = Buffer.from(await photo.arrayBuffer());

  const promptText = await loadPrompt("health-check.v1.md", {
    TANK_TYPE: tankType,
    LENGTH_CM: String(lengthCm),
    WIDTH_CM: String(widthCm),
    HEIGHT_CM: String(heightCm),
    VOLUME_L: String(volumeL),
    TANK_RECORD: tankRecord,
    REPLY_LANGUAGE: replyLanguage,
  });

  const result = await callContract({
    provider: ctx.provider,
    promptText,
    promptVersion: PROMPT_VERSION,
    jsonSchema: HealthCheckJsonSchema,
    zodSchema: HealthCheckZod,
    image: { base64: imageBuffer.toString("base64"), mimeType: photo.type || "image/jpeg" },
    extractGroundingRefs: (data) => [...data.grounding_refs, ...data.checks.flatMap((c) => c.grounding_refs)],
  });

  if (!result.ok) return NextResponse.json({ error: result.error, detail: result.detail }, { status: 422 });
  if (result.unresolvableRefs.length) console.error(`[${PROMPT_VERSION}] unresolvable grounding_refs:`, result.unresolvableRefs);

  // overall_status is computed here, never trusted from the model — see
  // deriveOverallStatus's own comment for why (framework's own explicit
  // design rule: a separately-guessed overall verdict can contradict the
  // real per-category details).
  const report: HealthCheckReport = { ...result.data, overall_status: deriveOverallStatus(result.data.checks) };

  return NextResponse.json({ report, meta: result.meta, unresolvableRefs: result.unresolvableRefs });
}
