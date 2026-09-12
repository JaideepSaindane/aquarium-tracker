import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { checkIpRateLimit } from "@/server/ai/ip-rate-limit";
import { stripCodeFences } from "@/server/ai/prompt-loader";

// Un-metered, same as /api/compat and /api/triage — a translate tap is a
// low-frequency, low-cost convenience action, not worth gating behind the
// quota system. Deliberately a plain free-text-in/free-text-out call, not
// a full callContract() (no grounding_refs/prompt_version to track — a
// translation makes no factual claim of its own to cite).
const SCHEMA = { type: "object", properties: { translated: { type: "string" } }, required: ["translated"] };

export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  if (!ctx.isByok) {
    const rate = await checkIpRateLimit(req);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  const body = await req.json();
  const text = String(body.text ?? "").trim();
  const targetLocale = body.targetLocale === "hi-latn" ? "hi-latn" : "en";
  if (!text) return NextResponse.json({ error: "No text provided." }, { status: 400 });

  const targetLabel = targetLocale === "hi-latn" ? "Hinglish (Latin script, natural spoken register, not formal Hindi)" : "English";
  const promptText = [
    `Translate the following user-generated community post/comment into ${targetLabel}.`,
    `Keep the meaning and tone. Do not add commentary, notes, or explanation of what you changed.`,
    `Return ONLY JSON matching the schema: {"translated": "..."}`,
    ``,
    `TEXT:`,
    text,
  ].join("\n");

  try {
    const result = await ctx.provider.answer({ promptText, responseSchema: SCHEMA });
    const parsed = JSON.parse(stripCodeFences(result.text));
    if (typeof parsed.translated !== "string" || !parsed.translated.trim()) {
      return NextResponse.json({ error: "Translation came back empty." }, { status: 422 });
    }
    return NextResponse.json({ translated: parsed.translated });
  } catch {
    return NextResponse.json({ error: "Translation failed." }, { status: 422 });
  }
}
