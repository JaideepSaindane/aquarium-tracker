import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { speciesSuggestions } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type PhotoCandidate = { species_id: string | null; common_name: string; scientific_name: string; confidence: number; why: string };

export async function addSpeciesSuggestion(input: { suggestedName: string; note?: string; photoUri?: string; aiCandidates?: PhotoCandidate[] }) {
  const id = newId();
  await db.insert(speciesSuggestions).values({
    id,
    suggestedName: input.suggestedName,
    note: input.note,
    photoUri: input.photoUri,
    aiCandidates: input.aiCandidates ? JSON.stringify(input.aiCandidates) : null,
    status: "pending",
    createdAt: nowIso(),
  });
  notifyChanged();
  return id;
}

export async function listSpeciesSuggestions() {
  return db.select().from(speciesSuggestions).orderBy(desc(speciesSuggestions.createdAt));
}

export async function setSpeciesSuggestionStatus(id: string, status: "approved" | "rejected") {
  await db.update(speciesSuggestions).set({ status, reviewedAt: nowIso() }).where(eq(speciesSuggestions.id, id));
  notifyChanged();
}
