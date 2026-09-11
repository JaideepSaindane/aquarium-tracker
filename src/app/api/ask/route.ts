import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { peekQuota, incrementQuota } from "@/server/ai/quota";
import { loadPrompt } from "@/server/ai/prompt-loader";
import { retrieveCorpus, retrieveRelevantSpecies, getSpeciesContextTextFor } from "@/server/ai/retrieval";
import { callContract } from "@/server/ai/call-contract";
import { AskZod, AskJsonSchema, PROMPT_VERSION } from "@/server/ai/schemas/ask";

// The server has no database in Phase 1 (docs/02-data-model.md) — the tank's
// full context lives client-side, so the client assembles and sends it.
// `tankContext` is a plain string the client builds from its local SQLite
// (dimensions, livestock, recent measurements, recent events) per the
// "Context assembled automatically" section of Contract 2.
export async function POST(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  if (!ctx.isByok) {
    const quota = await peekQuota(ctx.deviceId, "ask");
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `You've used your ${quota.limit} free questions this month. Resets ${quota.resetsAt}.`, resetsAt: quota.resetsAt },
        { status: 429 }
      );
    }
  }

  const body = await req.json();
  const question = String(body.question ?? "").trim();
  const tankContext = String(body.tankContext ?? "(no tank context provided)");
  const speciesIds: string[] = Array.isArray(body.speciesIds) ? body.speciesIds.map(String) : [];
  if (!question) return NextResponse.json({ error: "No question provided." }, { status: 400 });

  // The app's own language switch (Settings) is authoritative — do not let
  // the model guess the reply language from the question text. It used to
  // ("answer in the same language the question was asked in") and would
  // sometimes reply in Hinglish to a plain English question, since a few
  // Hinglish example answers sit right above it in the prompt. See
  // specs/PROGRESS.md 2026-09-02 feedback entry.
  const locale = body.locale === "hi-latn" ? "hi-latn" : "en";
  const replyLanguage = locale === "hi-latn" ? "Hinglish (Latin script)" : "English";

  const [corpus, relevantSpecies] = await Promise.all([retrieveCorpus(question), retrieveRelevantSpecies(question, speciesIds)]);
  const speciesContext = await getSpeciesContextTextFor(relevantSpecies);

  const promptText = await loadPrompt("ask.v3.md", {
    QUESTION: question,
    TANK_CONTEXT: tankContext,
    SPECIES_CONTEXT: speciesContext,
    CORPUS_CONTEXT: corpus.length ? corpus.map((c) => `[${c.id}]\n${c.text}`).join("\n\n") : "(none retrieved yet)",
    REPLY_LANGUAGE: replyLanguage,
  });

  const result = await callContract({
    provider: ctx.provider,
    promptText,
    promptVersion: PROMPT_VERSION,
    jsonSchema: AskJsonSchema,
    zodSchema: AskZod,
    extractGroundingRefs: (data) => data.grounding_refs,
  });

  if (!result.ok) return NextResponse.json({ error: result.error, detail: result.detail }, { status: 422 });

  if (!ctx.isByok) await incrementQuota(ctx.deviceId, "ask");
  if (result.unresolvableRefs.length) console.error(`[${PROMPT_VERSION}] unresolvable grounding_refs:`, result.unresolvableRefs);

  return NextResponse.json({ answer: result.data, meta: result.meta, unresolvableRefs: result.unresolvableRefs });
}
