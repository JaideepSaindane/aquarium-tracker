import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { checkIpRateLimit } from "@/server/ai/ip-rate-limit";
import { stripCodeFences } from "@/server/ai/prompt-loader";

// Un-metered, same as /api/compat and /api/triage — a translate tap is a
// low-frequency, low-cost convenience action, not worth gating behind the
// quota system. Deliberately a plain free-text-in/free-text-out call, not
// a full callContract() (no grounding_refs/prompt_version to track — a
// translation makes no factual claim of its own to cite).
// `detected_language` powers the "Translated from Marathi · Show original"
// pattern (redesign brief, Section 8) — a plain English name (e.g.
// "Marathi", "Hindi"), never a code, since that's what shows on screen.
const SCHEMA = {
  type: "object",
  properties: { translated: { type: "string" }, detected_language: { type: "string" } },
  required: ["translated", "detected_language"],
};

export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const rate = await checkIpRateLimit(req);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const body = await req.json();
  const text = String(body.text ?? "").trim();
  const targetLocale = body.targetLocale === "hi-latn" ? "hi-latn" : "en";
  if (!text) return NextResponse.json({ error: "No text provided." }, { status: 400 });

  const targetLabel = targetLocale === "hi-latn" ? "Hinglish (Latin script, natural spoken register, not formal Hindi)" : "English";
  const promptText = [
    `Translate the following user-generated community post/comment into ${targetLabel}.`,
    `Keep the meaning and tone. Do not add commentary, notes, or explanation of what you changed.`,
    `Also identify the source language it was actually written in, as a plain English name (e.g. "Marathi", "Hindi", "Tamil", "English") — this is shown to the user as "Translated from {language}", so it must be a real language name, never a code like "mr" or "hi".`,
    `Return ONLY JSON matching the schema: {"translated": "...", "detected_language": "..."}`,
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
    return NextResponse.json({ translated: parsed.translated, detectedLanguage: typeof parsed.detected_language === "string" ? parsed.detected_language : null });
  } catch {
    return NextResponse.json({ error: "Translation failed." }, { status: 422 });
  }
}
