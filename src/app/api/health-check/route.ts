import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { checkIpRateLimit } from "@/server/ai/ip-rate-limit";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { callContract } from "@/server/ai/call-contract";
import { HealthCheckZod, HealthCheckJsonSchema, PROMPT_VERSION, deriveOverallStatus, type HealthCheckReport } from "@/server/ai/schemas/health-check";
import { capText } from "@/server/ai/text-limits";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// A photo is optional (Jaideep, 2026-09-16 — requiring one was a dead end:
// a tank saved without a photo could never run a check at all). With one,
// this is the visual check it always was; without one, it reads the tank's
// own saved record instead and says so.
const WITH_PHOTO = `You are an experienced freshwater aquarium keeper doing a visual health
check on a photo of someone's already-set-up tank. You are careful,
specific, and honest about the real limits of what a single photo can tell
you.`;

const WITHOUT_PHOTO = `You are an experienced freshwater aquarium keeper reviewing someone's
already-set-up tank. There is NO photo this time — you have only the tank's
own saved record below (dimensions, type, equipment, livestock, recent water
parameters and log entries). You are careful, specific, and honest about the
real limits of what that record can tell you.

Work only from that record. Never describe anything as "visible", "seen" or
"in the photo" — you cannot see this tank. Where a category below depends on
looking at the tank (algae growth, water clarity, fish appearance, water
level, cleanliness), return \`status: "na"\` with an \`observation\` saying it
needs a photo — UNLESS the record itself carries real evidence (a logged
parameter, a note the keeper wrote, recorded equipment or stock), in which
case assess it from that and say which part of the record you used. Do not
invent an observation to fill a category.

Categories the record genuinely can answer — stocking (recorded livestock vs
volume), equipment (what's recorded, e.g. no heater or no filter listed for
this volume), and anything the recent parameters or log entries speak to —
are where the real value is here. Lead the \`summary\` with those, and end it
by saying a photo would let you check the visual categories too.`;

const PHOTO_QUALITY_WITH = `## Photo quality

Before anything else, judge the photo itself:
  - \`good\` — whole tank in frame, front-on, sharp enough to see fish detail
  - \`limited\` — usable but something is working against you (partial view,
    colored lighting, some blur) — still assess, but lower your confidence
  - \`insufficient\` — too dark/blurred/cropped to say anything reliable —
    still return a \`checks\` array, but every entry should be \`status: "na"\`
    with an \`observation\` explaining why, and the \`summary\` should say
    plainly that a retake is needed`;

const PHOTO_QUALITY_WITHOUT = `## Photo quality

There is no photo, so set \`photo_quality\` to \`"none"\`.`;

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
  const photoField = form.get("photo");
  const photo = photoField instanceof File && photoField.size > 0 ? photoField : null;
  if (photo && photo.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Photo is too large." }, { status: 400 });

  const lengthCm = Number(form.get("length_cm") ?? 0);
  const widthCm = Number(form.get("width_cm") ?? 0);
  const heightCm = Number(form.get("height_cm") ?? 0);
  const volumeL = Math.round(((lengthCm * widthCm * heightCm) / 1000) * 10) / 10;
  const tankType = capText(String(form.get("tank_type") ?? "unclear"), 200);
  const tankRecord = capText(String(form.get("tank_record") ?? "(no existing record)"), 8000);
  const locale = form.get("locale") === "hi-latn" ? "hi-latn" : "en";
  const replyLanguage = locale === "hi-latn" ? "Hinglish (Latin script)" : "English";

  const imageBuffer = photo ? Buffer.from(await photo.arrayBuffer()) : null;

  const promptText = await loadPrompt("health-check.v2.md", {
    MODE_INSTRUCTIONS: photo ? WITH_PHOTO : WITHOUT_PHOTO,
    PHOTO_QUALITY_INSTRUCTIONS: photo ? PHOTO_QUALITY_WITH : PHOTO_QUALITY_WITHOUT,
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
    image: imageBuffer && photo ? { base64: imageBuffer.toString("base64"), mimeType: photo.type || "image/jpeg" } : undefined,
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
