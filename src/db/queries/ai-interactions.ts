import { eq } from "drizzle-orm";
import { db } from "../client";
import { aiInteractions } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

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

/** Every AI answer is logged with what it cited and what it cost — docs/02-data-model.md. Returns the row id so a thumbs up/down can be attached later. */
export async function logAiInteraction(input: NewAiInteraction): Promise<string> {
  const now = nowIso();
  const id = newId();
  await db.insert(aiInteractions).values({
    id,
    tankId: input.tankId ?? null,
    kind: input.kind,
    promptVersion: input.promptVersion,
    userInput: input.userInput,
    groundingRefs: JSON.stringify(input.groundingRefs ?? []),
    response: JSON.stringify(input.response),
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    costUsd: input.costUsd,
    latencyMs: input.latencyMs,
    createdAt: now,
  });
  notifyChanged();
  return id;
}

export async function listAiInteractions() {
  return db.select().from(aiInteractions);
}

/** Thumbs up/down and an optional "this was wrong" correction — reviewed weekly per specs/T-019, corrections become new corpus entries. */
export async function rateAiInteraction(id: string, rating: 1 | -1, correctionText?: string) {
  await db
    .update(aiInteractions)
    .set({ rating, correctionText })
    .where(eq(aiInteractions.id, id));
  notifyChanged();
}
