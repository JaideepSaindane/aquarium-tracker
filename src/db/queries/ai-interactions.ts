import { notifyChanged } from "../live";

// Rewritten 2026-09-11 to call the new user-scoped server API
// (src/app/api/ai-interactions/*) — see tanks.ts's header comment for the
// original pattern this follows.

export type NewAiInteraction = {
  tankId?: string | null;
  kind: string;
  promptVersion: string;
  userInput?: string;
  groundingRefs?: string[];
  response: unknown;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
};

export type AiInteractionRow = {
  id: string;
  tankId: string | null;
  kind: string | null;
  promptVersion: string;
  userInput: string | null;
  groundingRefs: string | null;
  response: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  latencyMs: number | null;
  rating: number | null;
  correctionText: string | null;
  createdAt: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/** Every AI answer is logged with what it cited and what it cost — docs/02-data-model.md. Returns the row id so a thumbs up/down can be attached later. */
export async function logAiInteraction(input: NewAiInteraction): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/ai-interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function listAiInteractions(): Promise<AiInteractionRow[]> {
  return json(await fetch("/api/ai-interactions"));
}

/** Thumbs up/down and an optional "this was wrong" correction — reviewed weekly per specs/T-019, corrections become new corpus entries. */
export async function rateAiInteraction(id: string, rating: 1 | -1, correctionText?: string): Promise<void> {
  await fetch(`/api/ai-interactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, correctionText }),
  });
  notifyChanged();
}
