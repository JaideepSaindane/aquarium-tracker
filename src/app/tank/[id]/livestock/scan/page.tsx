"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { Chip } from "@/components/Chip";
import { Field } from "@/components/Field";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { DexUnlockToast } from "@/components/DexUnlockToast";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";
import { listSpecies, insertGeneratedSpecies } from "@/db/queries/species";
import { addLivestock } from "@/db/queries/livestock";
import { unlockDexCard } from "@/db/queries/dex";
import { identifySpecies, generateSpecies } from "@/lib/ai-client";

type Candidate = { species_id: string | null; common_name: string; scientific_name: string; confidence: number; why: string };

function firstName(json: string | null | undefined): string | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
  } catch {
    return null;
  }
}

/**
 * A dedicated, full-screen "identify this fish from a photo" flow — the
 * "AI native" page Jaideep asked for, reached from the tank overview's
 * Livestock "+ Add" popup's "Take a pic" option, instead of the photo
 * button being one option buried inside the by-name search form.
 */
export default function LivestockScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);
  const { data: allSpecies } = useLiveQuery(listSpecies, []);
  const speciesById = new Map((allSpecies ?? []).map((s) => [s.id, s]));

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [count, setCount] = useState("1");
  const [unlockToast, setUnlockToast] = useState<string | null>(null);

  async function handlePhoto(file: File) {
    setBusy("identify");
    setError(null);
    setCandidates(null);
    setSelectedSpeciesId(null);
    const result = await identifySpecies(file);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const data = result.data.speciesId as unknown as { candidates: Candidate[] };
    setCandidates(data.candidates);
  }

  async function handleAddAnyway(c: Candidate) {
    setBusy("generate");
    setError(null);
    const result = await generateSpecies(c.common_name);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const data = result.data.speciesGen as unknown as {
      species: Parameters<typeof insertGeneratedSpecies>[0]["species"];
      uncertainty_note: string;
      confidence: string;
      flags: string[];
    };
    const newId = await insertGeneratedSpecies({ species: data.species, uncertaintyNote: data.uncertainty_note, confidence: data.confidence, flags: data.flags });
    setSelectedSpeciesId(newId);
  }

  async function handleConfirmAdd() {
    if (!selectedSpeciesId || !count || Number(count) < 1) return;
    const species = speciesById.get(selectedSpeciesId);
    await addLivestock({ tankId: id, speciesId: selectedSpeciesId, count: Number(count) });
    const { isNewUnlock } = await unlockDexCard({ speciesId: selectedSpeciesId, unlockSource: "added_to_tank" });
    if (isNewUnlock) {
      setUnlockToast(firstName(species?.commonNames) ?? selectedSpeciesId);
      // Give the unlock animation a beat before leaving the page.
      setTimeout(() => router.replace(`/tank/${id}`), 900);
      return;
    }
    router.replace(`/tank/${id}`);
  }

  if (!tank) return <Screen>Loading...</Screen>;

  const selectedSpecies = selectedSpeciesId ? speciesById.get(selectedSpeciesId) : null;

  return (
    <Screen>
      {unlockToast && <DexUnlockToast speciesName={unlockToast} onDismiss={() => setUnlockToast(null)} />}
      <BackHeader title="Identify by photo" fallbackHref={`/tank/${id}`} />

      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
        Take a photo or upload one of the fish you want to add — we&apos;ll suggest what it might be.
      </p>

      <PhotoPickerButton label={busy === "identify" ? "Identifying..." : "📷 Take a photo or upload one"} onPick={handlePhoto} />

      {error && (
        <div style={{ marginTop: 12 }}>
          <Banner severity="watch">{error}</Banner>
        </div>
      )}

      {candidates && candidates.length === 0 && (
        <p style={{ color: "var(--color-ink-muted)", marginTop: 16 }}>
          Couldn&apos;t identify this one confidently. Try a clearer, closer photo — or go back and search by name instead.
        </p>
      )}

      {candidates && candidates.length > 0 && !selectedSpeciesId && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Our best guesses:</p>
          {candidates.map((c, i) =>
            c.species_id ? (
              <button
                key={i}
                onClick={() => setSelectedSpeciesId(c.species_id!)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: 10, border: "1px solid var(--color-line)", borderRadius: "var(--radius-md)", marginBottom: 6, background: "var(--color-surface)" }}
              >
                <SpeciesThumb imageUri={speciesById.get(c.species_id)?.imageUri} category={speciesById.get(c.species_id)?.category} size={44} />
                <span style={{ flex: 1 }}>
                  {c.common_name} {c.confidence < 0.5 && <Chip variant="watch">low confidence</Chip>}
                  <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: 0 }}>{c.why}</p>
                </span>
              </button>
            ) : (
              <div key={i} style={{ padding: 10, border: "1px solid var(--color-line)", borderRadius: "var(--radius-md)", marginBottom: 6, background: "var(--color-surface)" }}>
                <p style={{ margin: 0 }}>
                  {c.common_name} <span style={{ color: "var(--color-ink-muted)", fontStyle: "italic", fontSize: "var(--font-caption-size)" }}>{c.scientific_name}</span>
                </p>
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "2px 0 8px" }}>{c.why}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Chip variant="watch">Not in our catalog</Chip>
                  <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => handleAddAnyway(c)} disabled={busy === "generate"}>
                    {busy === "generate" ? "Adding..." : "Add it anyway"}
                  </SecondaryButton>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {selectedSpeciesId && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <SpeciesThumb imageUri={selectedSpecies?.imageUri} category={selectedSpecies?.category} size={44} />
            <strong>{firstName(selectedSpecies?.commonNames ?? null) ?? selectedSpeciesId}</strong>
          </div>
          <Field label="Count" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
          <div style={{ height: 12 }} />
          <PrimaryButton onClick={handleConfirmAdd} disabled={!count || Number(count) < 1}>
            Add to tank
          </PrimaryButton>
        </Card>
      )}
    </Screen>
  );
}
