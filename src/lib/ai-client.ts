"use client";

// Thin client for the AI proxy routes (T-013). Every call attaches the
// device id (and the user's own key, if they've entered one in Settings —
// bring-your-own-key mode, T-025) and logs the result into the local
// ai_interactions table so cost/usage is visible per docs/02-data-model.md.
import { getDeviceId } from "./device-id";
import { logAiInteraction } from "@/db/queries/ai-interactions";

let byokKey: string | null = null;
/** In-memory only, per session — never persisted, per specs/T-013. */
export function setByokKey(key: string | null) {
  byokKey = key;
}
export function hasByokKey(): boolean {
  return byokKey !== null;
}

function headers(extra?: Record<string, string>): HeadersInit {
  const h: Record<string, string> = { "x-device-id": getDeviceId(), ...extra };
  if (byokKey) h["x-user-api-key"] = byokKey;
  return h;
}

export type AiCallResult<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string; resetsAt?: string };

async function handleJsonResponse<T>(res: Response): Promise<AiCallResult<T>> {
  const body = await res.json();
  if (!res.ok) return { ok: false, error: body.error ?? "Request failed", detail: body.detail, resetsAt: body.resetsAt };
  return { ok: true, data: body };
}

type ScanMeta = { provider: string; tokensIn: number; tokensOut: number; costUsd: number; latencyMs: number };

export async function scanTank(params: {
  photo: File;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  city: string;
  tankId?: string;
  /** buildTankContext(tankId) output — only for a re-check of an existing tank, never a first scan. */
  tankRecord?: string;
}) {
  const form = new FormData();
  form.set("photo", params.photo);
  form.set("length_cm", String(params.lengthCm));
  form.set("width_cm", String(params.widthCm));
  form.set("height_cm", String(params.heightCm));
  form.set("city", params.city);
  if (params.tankRecord) form.set("tank_record", params.tankRecord);

  const res = await fetch("/api/scan", { method: "POST", headers: headers(), body: form });
  const result = await handleJsonResponse<{ report: Record<string, unknown>; meta: ScanMeta; unresolvableRefs: string[] }>(res);

  if (result.ok) {
    await logAiInteraction({
      tankId: params.tankId,
      kind: "scan",
      promptVersion: String(result.data.report.prompt_version),
      groundingRefs: extractRefs(result.data.report),
      response: result.data.report,
      inputTokens: result.data.meta.tokensIn,
      outputTokens: result.data.meta.tokensOut,
      costUsd: result.data.meta.costUsd,
      latencyMs: result.data.meta.latencyMs,
    });
  }
  return result;
}

export async function askQuestion(params: { question: string; tankContext: string; tankId?: string; locale?: string }) {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ question: params.question, tankContext: params.tankContext, locale: params.locale }),
  });
  const result = await handleJsonResponse<{ answer: Record<string, unknown>; meta: ScanMeta; unresolvableRefs: string[]; interactionId?: string }>(res);

  if (result.ok) {
    const interactionId = await logAiInteraction({
      tankId: params.tankId,
      kind: "ask",
      promptVersion: String(result.data.answer.prompt_version),
      userInput: params.question,
      groundingRefs: extractRefs(result.data.answer),
      response: result.data.answer,
      inputTokens: result.data.meta.tokensIn,
      outputTokens: result.data.meta.tokensOut,
      costUsd: result.data.meta.costUsd,
      latencyMs: result.data.meta.latencyMs,
    });
    result.data.interactionId = interactionId;
  }
  return result;
}

export async function runTriage(params: {
  photo?: File;
  description: string;
  affectedCount: string;
  duration: string;
  recentTest: string;
  tankAgeDays: string;
  tankId?: string;
}) {
  const form = new FormData();
  if (params.photo) form.set("photo", params.photo);
  form.set("description", params.description);
  form.set("affected_count", params.affectedCount);
  form.set("duration", params.duration);
  form.set("recent_test", params.recentTest);
  form.set("tank_age_days", params.tankAgeDays);

  const res = await fetch("/api/triage", { method: "POST", headers: headers(), body: form });
  const result = await handleJsonResponse<{ triage: Record<string, unknown>; meta: ScanMeta; unresolvableRefs: string[] }>(res);

  if (result.ok) {
    await logAiInteraction({
      tankId: params.tankId,
      kind: "triage",
      promptVersion: String(result.data.triage.prompt_version),
      userInput: params.description,
      groundingRefs: extractRefs(result.data.triage),
      response: result.data.triage,
      inputTokens: result.data.meta.tokensIn,
      outputTokens: result.data.meta.tokensOut,
      costUsd: result.data.meta.costUsd,
      latencyMs: result.data.meta.latencyMs,
    });
  }
  return result;
}

export async function checkCompat(params: {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  existingSpeciesIds: string[];
  newSpeciesIds: string[];
  tankId?: string;
}) {
  const res = await fetch("/api/compat", {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(params),
  });
  const result = await handleJsonResponse<{ compat: Record<string, unknown>; meta: ScanMeta | { cacheHit: boolean } }>(res);

  if (result.ok && "tokensIn" in result.data.meta) {
    await logAiInteraction({
      tankId: params.tankId,
      kind: "compatibility",
      promptVersion: String(result.data.compat.prompt_version),
      groundingRefs: extractRefs(result.data.compat),
      response: result.data.compat,
      inputTokens: result.data.meta.tokensIn,
      outputTokens: result.data.meta.tokensOut,
      costUsd: result.data.meta.costUsd,
      latencyMs: result.data.meta.latencyMs,
    });
  }
  return result;
}

export async function generateSpecies(query: string) {
  const res = await fetch("/api/species-gen", {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ query }),
  });
  const result = await handleJsonResponse<{ speciesGen: Record<string, unknown>; meta: ScanMeta | { cacheHit: boolean } }>(res);

  if (result.ok && "tokensIn" in result.data.meta) {
    await logAiInteraction({
      kind: "species_gen",
      promptVersion: String(result.data.speciesGen.prompt_version),
      userInput: query,
      response: result.data.speciesGen,
      inputTokens: result.data.meta.tokensIn,
      outputTokens: result.data.meta.tokensOut,
      costUsd: result.data.meta.costUsd,
      latencyMs: result.data.meta.latencyMs,
    });
  }
  return result;
}

export async function identifySpecies(photo: File) {
  const form = new FormData();
  form.set("photo", photo);
  const res = await fetch("/api/species-id", { method: "POST", headers: headers(), body: form });
  const result = await handleJsonResponse<{ speciesId: Record<string, unknown>; meta: ScanMeta; invalidCandidates: string[] }>(res);

  if (result.ok) {
    await logAiInteraction({
      kind: "species_id",
      promptVersion: String(result.data.speciesId.prompt_version),
      response: result.data.speciesId,
      inputTokens: result.data.meta.tokensIn,
      outputTokens: result.data.meta.tokensOut,
      costUsd: result.data.meta.costUsd,
      latencyMs: result.data.meta.latencyMs,
    });
  }
  return result;
}

/** T-027 AI-first planner: one expert read on the user's tank-type + size-band + fish wish list. */
export async function getPlannerAdvice(params: { tankType: string; band: string; city: string; wishList: string[] }) {
  const res = await fetch("/api/planner", {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(params),
  });
  const result = await handleJsonResponse<{ plan: Record<string, unknown>; meta: ScanMeta; unresolvableRefs: string[] }>(res);

  if (result.ok) {
    await logAiInteraction({
      kind: "planner",
      promptVersion: String(result.data.plan.prompt_version),
      userInput: `${params.tankType}/${params.band}: ${params.wishList.join(", ")}`,
      groundingRefs: extractRefs(result.data.plan),
      response: result.data.plan,
      inputTokens: result.data.meta.tokensIn,
      outputTokens: result.data.meta.tokensOut,
      costUsd: result.data.meta.costUsd,
      latencyMs: result.data.meta.latencyMs,
    });
  }
  return result;
}

export type QuotaStatus =
  | { isByok: true }
  | { isByok: false; earlyBird: boolean; allowed: true; used: number; limit: number }
  | { isByok: false; earlyBird: boolean; allowed: false; used: number; limit: number; resetsAt: string };

/** Read-only — never counts against the quota. Lets the UI warn before the last question, not after (specs/T-019). */
export async function peekQuotaStatus(kind: "scan" | "ask"): Promise<QuotaStatus | null> {
  const res = await fetch(`/api/quota?kind=${kind}`, { headers: headers() });
  if (!res.ok) return null;
  return res.json();
}

function extractRefs(data: Record<string, unknown>): string[] {
  const refs = data.grounding_refs;
  return Array.isArray(refs) ? (refs as string[]) : [];
}
