import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { requireUserId } from "@/server/auth/require-user";
import { peekQuota, incrementQuota } from "@/server/ai/quota";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { retrieveCorpus } from "@/server/ai/retrieval";
import { callContract } from "@/server/ai/call-contract";
import { TankScanZod, TankScanJsonSchema, PROMPT_VERSION } from "@/server/ai/schemas/tank-scan";

// Client downscales to ~1024px before upload (specs/T-013) — this is a
// sanity ceiling, not the resize step itself.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  // Quota is keyed by the real signed-in account, not the client-reported
  // x-device-id header — see the matching note in /api/ask/route.ts.
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!ctx.isByok) {
    const quota = await peekQuota(userId, "scan");
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `You've used your ${quota.limit} free scans this month. Resets ${quota.resetsAt}.`, resetsAt: quota.resetsAt },
        { status: 429 }
      );
    }
  }

  const form = await req.formData();
  const photo = form.get("photo");
  const lengthCm = Number(form.get("length_cm"));
  const widthCm = Number(form.get("width_cm"));
  const heightCm = Number(form.get("height_cm"));
  const city = String(form.get("city") ?? "");
  // Only present for a re-check of an existing tank (buildTankContext, sent
  // by the client — the server has no database of its own to look this up
  // in, per the app's local-first architecture). Absent for a first scan.
  const tankRecord = form.get("tank_record");

  if (!(photo instanceof File)) return NextResponse.json({ error: "No photo uploaded." }, { status: 400 });
  if (photo.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Photo is too large." }, { status: 400 });
  if (!lengthCm || !widthCm || !heightCm) return NextResponse.json({ error: "Missing tank dimensions." }, { status: 400 });

  const volumeL = Math.round(((lengthCm * widthCm * heightCm) / 1000) * 10) / 10;
  const imageBuffer = Buffer.from(await photo.arrayBuffer());
  const corpus = await retrieveCorpus("tank scan equipment algae setup");

  const promptText = await loadPrompt("tank-scan.v2.md", {
    LENGTH_CM: String(lengthCm),
    WIDTH_CM: String(widthCm),
    HEIGHT_CM: String(heightCm),
    VOLUME_L: String(volumeL),
    CITY: city || "(not provided)",
    TANK_RECORD: typeof tankRecord === "string" && tankRecord.trim() ? tankRecord : "(none — first scan for a new tank)",
    CORPUS_CONTEXT: corpus.length ? corpus.map((c) => `[${c.id}]\n${c.text}`).join("\n\n") : "(none retrieved yet)",
  });

  const result = await callContract({
    provider: ctx.provider,
    promptText,
    promptVersion: PROMPT_VERSION,
    jsonSchema: TankScanJsonSchema,
    zodSchema: TankScanZod,
    image: { base64: imageBuffer.toString("base64"), mimeType: photo.type || "image/jpeg" },
    extractGroundingRefs: (data) => [...data.grounding_refs, ...data.findings.flatMap((f) => f.grounding_refs)],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: 422 });
  }

  if (!ctx.isByok) await incrementQuota(userId, "scan");
  if (result.unresolvableRefs.length) {
    console.error(`[${PROMPT_VERSION}] unresolvable grounding_refs:`, result.unresolvableRefs);
  }

  return NextResponse.json({ report: result.data, meta: result.meta, unresolvableRefs: result.unresolvableRefs });
}
