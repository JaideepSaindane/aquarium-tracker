"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Banner } from "@/components/Banner";
import { Chip } from "@/components/Chip";
import { Field } from "@/components/Field";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { DexUnlockToast } from "@/components/DexUnlockToast";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";
import { listLivestockForTank, addLivestock } from "@/db/queries/livestock";
import { listSpecies, searchSpecies, insertGeneratedSpecies } from "@/db/queries/species";
import { unlockDexCard } from "@/db/queries/dex";
import { generateSpecies } from "@/lib/ai-client";
import { isAiGenerated } from "@/lib/species-origin";
import { CompatibilitySummary } from "@/components/CompatibilitySummary";
import { useTranslation } from "@/i18n/use-translation";

type SpeciesRow = Awaited<ReturnType<typeof listSpecies>>[number];

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
 * A dedicated, full-screen "add a fish by name" flow — same reasoning as
 * the photo-ID page (livestock/scan): search results, compatibility
 * warnings, and the AI "add anyway" card all need real room, which a small
 * inline card on the crowded tank overview page couldn't give them.
 */
export default function LivestockSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslation();
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);
  const { data: allSpecies } = useLiveQuery(listSpecies, []);
  const { data: livestock } = useLiveQuery(() => listLivestockForTank(id), [id]);
  const speciesById = new Map((allSpecies ?? []).map((s) => [s.id, s]));
  const aliveLivestock = (livestock ?? []).filter((l) => l.status === "alive");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpeciesRow[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [count, setCount] = useState("1");
  const [busy, setBusy] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<{ speciesId: string; count: number }[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    setSelectedSpeciesId(null);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchResults(await searchSpecies(value));
  }

  function selectSpecies(speciesId: string) {
    setSelectedSpeciesId(speciesId);
    setSearchResults([]);
  }

  async function handleAddItAnyway() {
    setBusy("generate");
    setGenError(null);
    const result = await generateSpecies(query);
    setBusy(null);
    if (!result.ok) {
      setGenError(result.error);
      return;
    }
    const data = result.data.speciesGen as unknown as {
      species: Parameters<typeof insertGeneratedSpecies>[0]["species"];
      uncertainty_note: string;
      confidence: string;
      flags: string[];
    };
    const newId = await insertGeneratedSpecies({ species: data.species, uncertaintyNote: data.uncertainty_note, confidence: data.confidence, flags: data.flags });
    selectSpecies(newId);
  }


  async function handleConfirmAdd() {
    if (!selectedSpeciesId || !count || Number(count) < 1) return;
    const species = speciesById.get(selectedSpeciesId);
    setSaving(true);
    await addLivestock({ tankId: id, speciesId: selectedSpeciesId, count: Number(count) });
    const { isNewUnlock } = await unlockDexCard({ speciesId: selectedSpeciesId, unlockSource: "added_to_tank" });
    if (isNewUnlock) {
      setUnlockToast(firstName(species?.commonNames) ?? selectedSpeciesId);
    }
    // Stay on this page — adding is additive (Jaideep, 2026-09-06): the
    // user adds one fish after another from here, no exit per add. The
    // just-added species joins the "already in this tank" list below, the
    // search resets for the next one, and Done goes back to the tank.
    setJustAdded((prev) => [...prev, { speciesId: selectedSpeciesId, count: Number(count) }]);
    setSelectedSpeciesId(null);
    setCount("1");
    setQuery("");
    setSearchResults([]);
    setSaving(false);
  }

  if (!tank) return <Screen>{t.common.loading}</Screen>;

  const selectedSpecies = selectedSpeciesId ? speciesById.get(selectedSpeciesId) : null;

  return (
    <Screen
      footer={
        <>
          {justAdded.length > 0 && (
            <p style={{ margin: "0 0 8px", color: "var(--color-improve)", fontSize: "var(--font-body-sm-size)", fontWeight: 600, textAlign: "center" }}>
              ✓ {t.livestockScanPage.fishAddedThisSession.replace("{n}", String(justAdded.length))}
            </p>
          )}
          <PrimaryButton onClick={() => router.replace(`/tank/${id}`)}>{t.livestockScanPage.doneBackToTank}</PrimaryButton>
        </>
      }
    >
      {unlockToast && <DexUnlockToast speciesName={unlockToast} onDismiss={() => setUnlockToast(null)} />}
      <BackHeader title={t.livestockSearchPage.addAFish} fallbackHref={`/tank/${id}`} />

      {/* Search goes first, right under the header — the "already in this
          tank" list used to sit above it, which could push search results
          far enough down the page to end up under the on-screen keyboard
          (Jaideep hit this on a tank with several species already added).
          Existing fish now show near the bottom instead, below what you're
          actively doing here. */}
      <Field label={t.livestockSearchPage.searchSpecies} value={query} onChange={(e) => handleSearch(e.target.value)} placeholder={t.livestockSearchPage.egNeonTetra} autoFocus />

      {searchResults.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {searchResults.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSpecies(s.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: 10, border: "1px solid var(--color-line)", borderRadius: "var(--radius-md)", marginBottom: 6, background: "var(--color-surface)" }}
            >
              <SpeciesThumb imageUri={s.imageUri} category={s.category} size={44} />
              <span>
                {firstName(s.commonNames) ?? s.id} {isAiGenerated(s) && <Chip variant="unverified">{t.livestockSearchPage.aiGenerated}</Chip>}
              </span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && searchResults.length === 0 && !selectedSpeciesId && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "var(--color-ink-muted)", marginBottom: 8 }}>{t.livestockSearchPage.notInCatalogYet}</p>
          <SecondaryButton onClick={handleAddItAnyway} disabled={busy === "generate"}>
            {busy === "generate" ? t.livestockSearchPage.generatingCard : t.livestockSearchPage.addQueryAnyway.replace("{query}", query)}
          </SecondaryButton>
        </div>
      )}

      {genError && (
        <div style={{ marginTop: 12 }}>
          <Banner severity="watch">{genError}</Banner>
        </div>
      )}

      {selectedSpeciesId && (
        <div style={{ marginTop: 20, borderTop: "1px solid var(--color-line)", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <SpeciesThumb imageUri={selectedSpecies?.imageUri} category={selectedSpecies?.category} size={44} />
            <strong>
              {firstName(selectedSpecies?.commonNames ?? null) ?? selectedSpeciesId}{" "}
              {selectedSpecies && isAiGenerated(selectedSpecies) && <Chip variant="unverified">{t.livestockSearchPage.aiGenerated}</Chip>}
            </strong>
          </div>
          <label style={{ display: "block", fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 6 }}>{t.livestockScanPage.count}</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              aria-label={t.livestockSearchPage.decreaseCount}
              onClick={() => setCount((c) => String(Math.max(1, (Number(c) || 1) - 1)))}
              style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", border: "1px solid var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)", fontSize: 18, fontWeight: 700, cursor: "pointer" }}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={{ width: 64, textAlign: "center", padding: "8px 4px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)", fontSize: "var(--font-body-size)", fontWeight: 600 }}
            />
            <button
              type="button"
              aria-label={t.livestockSearchPage.increaseCount}
              onClick={() => setCount((c) => String((Number(c) || 0) + 1))}
              style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", border: "1px solid var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)", fontSize: 18, fontWeight: 700, cursor: "pointer" }}
            >
              +
            </button>
          </div>
          <div style={{ height: 12 }} />

          {/* Free, instant, no AI call — the only compatibility check in
              this flow, per Jaideep's explicit call to drop the AI one. */}
          {tank && selectedSpecies && (
            <CompatibilitySummary
              tank={tank}
              species={selectedSpecies}
              existingSpecies={aliveLivestock.map((l) => speciesById.get(l.speciesId)).filter((s): s is SpeciesRow => !!s)}
            />
          )}

          <div style={{ height: 8 }} />
          <PrimaryButton onClick={handleConfirmAdd} disabled={!count || Number(count) < 1 || saving}>
            {saving ? t.livestockScanPage.addingEllipsisLong : t.dexDetailPage.addToTank}
          </PrimaryButton>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 8, textAlign: "center" }}>
            {t.livestockSearchPage.keepAddingMore}
          </p>
        </div>
      )}

      {/* What this session has added so far — additive flow (Jaideep, 2026-09-06). */}
      {justAdded.length > 0 && (
        <div style={{ marginTop: 24, borderTop: "1px solid var(--color-line)", paddingTop: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.livestockScanPage.addedJustNow}</p>
          {justAdded.map((j, i) => {
            const s = speciesById.get(j.speciesId);
            return (
              <div key={`${j.speciesId}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <SpeciesThumb imageUri={s?.imageUri} category={s?.category} size={28} />
                <span style={{ flex: 1, fontSize: "var(--font-body-sm-size)" }}>
                  {j.count}× {firstName(s?.commonNames ?? null) ?? j.speciesId}
                </span>
                <Chip variant="improve">{t.livestockScanPage.added}</Chip>
              </div>
            );
          })}
        </div>
      )}

      {aliveLivestock.length > 0 && (
        <div style={{ marginTop: 24, borderTop: "1px solid var(--color-line)", paddingTop: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8, color: "var(--color-ink-muted)" }}>{t.livestockScanPage.alreadyInThisTank}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {aliveLivestock.map((l) => {
              const s = speciesById.get(l.speciesId);
              return (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 4px", border: "1px solid var(--color-line)", borderRadius: "var(--radius-pill)", background: "var(--color-surface-alt)" }}>
                  <SpeciesThumb imageUri={s?.imageUri} category={s?.category} size={22} />
                  <span style={{ fontSize: "var(--font-caption-size)" }}>
                    {firstName(s?.commonNames ?? null) ?? l.speciesId} × {l.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Screen>
  );
}
