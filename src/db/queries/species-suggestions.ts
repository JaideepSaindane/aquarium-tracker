import { notifyChanged } from "../live";

// Rewritten 2026-09-11 to call the new user-scoped server API
// (src/app/api/species-suggestions/*) — see tanks.ts's header comment for
// the original pattern this follows. (Previously deliberately local-only,
// same tradeoff as push reminders' narrow mirror — Jaideep asked for the
// full remaining-tables migration explicitly, which supersedes that.)

export type PhotoCandidate = { species_id: string | null; common_name: string; scientific_name: string; confidence: number; why: string };

export type SpeciesSuggestionRow = {
  id: string;
  suggestedName: string;
  note: string | null;
  photoUri: string | null;
  aiCandidates: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function addSpeciesSuggestion(input: {
  suggestedName: string;
  note?: string;
  photoUri?: string;
  aiCandidates?: PhotoCandidate[];
}): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/species-suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

export async function listSpeciesSuggestions(): Promise<SpeciesSuggestionRow[]> {
  return json(await fetch("/api/species-suggestions"));
}

export async function setSpeciesSuggestionStatus(id: string, status: "approved" | "rejected"): Promise<void> {
  await fetch(`/api/species-suggestions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  notifyChanged();
}
