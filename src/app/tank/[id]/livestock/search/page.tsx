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
import { checkCompat, generateSpecies } from "@/lib/ai-client";
import { dismissWarning, isWarningDismissed, compatWarningKey } from "@/db/queries/dismissed-warnings";
import { isAiGenerated } from "@/lib/species-origin";

type SpeciesRow = Awaited<ReturnType<typeof listSpecies>>[number];
type CompatConflict = { type: string; severity: string; explanation: string; with: string[]; mitigation: string };

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

  // Compatibility runs once, in a single batch, when leaving via "Done" —
  // not per fish while adding (2026-09-10, same pattern as the by-name add
  // form and photo-ID screen: a one-at-a-time check while adding could
  // never catch a conflict between two fish added in the same visit).
  const [doneChecking, setDoneChecking] = useState(false);
  const [doneCompatResult, setDoneCompatResult] = useState<{ verdict: string; conflicts: CompatConflict[]; footprintNote: string } | null>(null);
  const [doneDismissedKeys, setDoneDismissedKeys] = useState<Set<string>>(new Set());

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

  async function handleDone() {
    if (doneCompatResult) {
      router.replace(`/tank/${id}`);
      return;
    }
    if (!tank || justAdded.length === 0) {
      router.replace(`/tank/${id}`);
      return;
    }
    setDoneChecking(true);
    const existingSpeciesIds = Array.from(new Set(aliveLivestock.map((l) => l.speciesId)));
    const newSpeciesIds = Array.from(new Set(justAdded.map((j) => j.speciesId)));
    const result = await checkCompat({
      lengthCm: tank.lengthCm,
      widthCm: tank.widthCm,
      heightCm: tank.heightCm,
      existingSpeciesIds,
      newSpeciesIds,
      tankId: id,
    });
    setDoneChecking(false);
    if (!result.ok) {
      router.replace(`/tank/${id}`);
      return;
    }
    const data = result.data.compat as unknown as { verdict: string; conflicts: CompatConflict[]; footprint_note: string };
    const dismissed = new Set<string>();
    for (const c of data.conflicts) {
      const key = compatWarningKey(newSpeciesIds, c.type, c.with);
      if (await isWarningDismissed(key)) dismissed.add(key);
    }
    setDoneDismissedKeys(dismissed);
    setDoneCompatResult({ verdict: data.verdict, conflicts: data.conflicts, footprintNote: data.footprint_note });
  }

  async function handleDismissDoneConflict(conflict: CompatConflict) {
    const newSpeciesIds = Array.from(new Set(justAdded.map((j) => j.speciesId)));
    const key = compatWarningKey(newSpeciesIds, conflict.type, conflict.with);
    await dismissWarning({ tankId: id, warningKey: key });
    setDoneDismissedKeys((prev) => new Set(prev).add(key));
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

  if (!tank) return <Screen>Loading...</Screen>;

  const selectedSpecies = selectedSpeciesId ? speciesById.get(selectedSpeciesId) : null;

  return (
    <Screen
      footer={
        <>
          {justAdded.length > 0 && (
            <p style={{ margin: "0 0 8px", color: "var(--color-improve)", fontSize: "var(--font-body-sm-size)", fontWeight: 600, textAlign: "center" }}>
              ✓ {justAdded.length} fish added this session
            </p>
          )}
          <PrimaryButton onClick={handleDone} disabled={doneChecking}>
            {doneChecking ? "Checking compatibility..." : doneCompatResult ? "Continue to my tank" : "Done — back to my tank"}
          </PrimaryButton>
        </>
      }
    >
      {unlockToast && <DexUnlockToast speciesName={unlockToast} onDismiss={() => setUnlockToast(null)} />}
      <BackHeader title="Add a fish" fallbackHref={`/tank/${id}`} />

      {doneCompatResult && (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid var(--color-line)", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Compatibility check</p>
          {doneCompatResult.conflicts.filter((c) => !doneDismissedKeys.has(compatWarningKey(Array.from(new Set(justAdded.map((j) => j.speciesId))), c.type, c.with))).length === 0 && (
            <Banner severity="improve">No conflicts found between your fish.</Banner>
          )}
          {doneCompatResult.conflicts
            .filter((c) => !doneDismissedKeys.has(compatWarningKey(Array.from(new Set(justAdded.map((j) => j.speciesId))), c.type, c.with)))
            .map((c, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <Banner severity={c.severity === "critical" ? "fixNow" : "watch"} onDismiss={() => handleDismissDoneConflict(c)}>
                  {c.explanation} {c.mitigation ? `— ${c.mitigation}` : ""}
                </Banner>
              </div>
            ))}
          {doneCompatResult.footprintNote && (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{doneCompatResult.footprintNote}</p>
          )}
        </div>
      )}

      {/* Search goes first, right under the header — the "already in this
          tank" list used to sit above it, which could push search results
          far enough down the page to end up under the on-screen keyboard
          (Jaideep hit this on a tank with several species already added).
          Existing fish now show near the bottom instead, below what you're
          actively doing here. */}
      <Field label="Search species" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="e.g. neon tetra" autoFocus />

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
                {firstName(s.commonNames) ?? s.id} {isAiGenerated(s) && <Chip variant="unverified">AI-generated</Chip>}
              </span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && searchResults.length === 0 && !selectedSpeciesId && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "var(--color-ink-muted)", marginBottom: 8 }}>Not in our catalog yet.</p>
          <SecondaryButton onClick={handleAddItAnyway} disabled={busy === "generate"}>
            {busy === "generate" ? "Generating a card..." : `Add "${query}" anyway`}
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
              {selectedSpecies && isAiGenerated(selectedSpecies) && <Chip variant="unverified">AI-generated</Chip>}
            </strong>
          </div>
          <label style={{ display: "block", fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 6 }}>Count</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              aria-label="Decrease count"
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
              aria-label="Increase count"
              onClick={() => setCount((c) => String((Number(c) || 0) + 1))}
              style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", border: "1px solid var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)", fontSize: 18, fontWeight: 700, cursor: "pointer" }}
            >
              +
            </button>
          </div>
          <div style={{ height: 12 }} />

          {/* Free, instant, no AI call — size/temp/pH/setup fit is computed
              straight from species/tank data. Real AI compatibility (how
              this species behaves around tankmates) now runs once, in a
              batch, on "Done" — see handleDone above. */}
          {tank && selectedSpecies && (
            <CompatibilitySummary
              tank={tank}
              species={selectedSpecies}
              existingSpecies={aliveLivestock.map((l) => speciesById.get(l.speciesId)).filter((s): s is SpeciesRow => !!s)}
            />
          )}

          <div style={{ height: 8 }} />
          <PrimaryButton onClick={handleConfirmAdd} disabled={!count || Number(count) < 1 || saving}>
            {saving ? "Adding…" : "Add to tank"}
          </PrimaryButton>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 8, textAlign: "center" }}>
            You can keep adding more fish after this — the page stays open.
          </p>
        </div>
      )}

      {/* What this session has added so far — additive flow (Jaideep, 2026-09-06). */}
      {justAdded.length > 0 && (
        <div style={{ marginTop: 24, borderTop: "1px solid var(--color-line)", paddingTop: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Added just now</p>
          {justAdded.map((j, i) => {
            const s = speciesById.get(j.speciesId);
            return (
              <div key={`${j.speciesId}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <SpeciesThumb imageUri={s?.imageUri} category={s?.category} size={28} />
                <span style={{ flex: 1, fontSize: "var(--font-body-sm-size)" }}>
                  {j.count}× {firstName(s?.commonNames ?? null) ?? j.speciesId}
                </span>
                <Chip variant="improve">added</Chip>
              </div>
            );
          })}
        </div>
      )}

      {aliveLivestock.length > 0 && (
        <div style={{ marginTop: 24, borderTop: "1px solid var(--color-line)", paddingTop: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8, color: "var(--color-ink-muted)" }}>Already in this tank</p>
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

type Verdict = "ok" | "watch" | "fixNow";

/**
 * A crisp, always-the-same-shape compatibility readout — Size, Temp,
 * Parameters, and Setup are computed straight from species/tank data (no AI
 * round trip, no risk of vague prose), with a "Fish compatibility" section
 * underneath carrying the one thing that genuinely needs the model: how
 * this species behaves around what's already in the tank.
 */
function CompatibilitySummary({
  tank,
  species,
  existingSpecies,
}: {
  tank: { volumeL: number; lengthCm: number; widthCm: number };
  species: SpeciesRow;
  existingSpecies: SpeciesRow[];
}) {
  const rows: { label: string; verdict: Verdict; text: string }[] = [];

  // Size
  if (species.minVolumeL != null) {
    const ok = tank.volumeL >= species.minVolumeL;
    rows.push({
      label: "Size",
      verdict: ok ? "ok" : "fixNow",
      text: ok ? `Needs ${species.minVolumeL}+ L — your ${tank.volumeL} L tank fits` : `Needs ${species.minVolumeL}+ L — your tank is only ${tank.volumeL} L`,
    });
  }

  // Temp — overlap against whatever's already alive in the tank, not just this one species in isolation.
  if (species.tempCMin != null && species.tempCMax != null) {
    const existingRanges = existingSpecies.filter((s) => s.tempCMin != null && s.tempCMax != null);
    if (existingRanges.length > 0) {
      const overlapMin = Math.max(species.tempCMin, ...existingRanges.map((s) => s.tempCMin as number));
      const overlapMax = Math.min(species.tempCMax, ...existingRanges.map((s) => s.tempCMax as number));
      const ok = overlapMin <= overlapMax;
      rows.push({
        label: "Temp",
        verdict: ok ? "ok" : "fixNow",
        text: ok ? `${species.tempCMin}–${species.tempCMax}°C — overlaps your tank's current ${overlapMin}–${overlapMax}°C range` : `${species.tempCMin}–${species.tempCMax}°C — doesn't overlap what you already keep (needs ${overlapMin}–${overlapMax}°C)`,
      });
    } else {
      rows.push({ label: "Temp", verdict: "ok", text: `${species.tempCMin}–${species.tempCMax}°C` });
    }
  }

  // Parameters (pH)
  if (species.phMin != null && species.phMax != null) {
    const existingRanges = existingSpecies.filter((s) => s.phMin != null && s.phMax != null);
    if (existingRanges.length > 0) {
      const overlapMin = Math.max(species.phMin, ...existingRanges.map((s) => s.phMin as number));
      const overlapMax = Math.min(species.phMax, ...existingRanges.map((s) => s.phMax as number));
      const ok = overlapMin <= overlapMax;
      rows.push({
        label: "Parameters",
        verdict: ok ? "ok" : "watch",
        text: ok ? `pH ${species.phMin}–${species.phMax} — overlaps your tank's current ${overlapMin.toFixed(1)}–${overlapMax.toFixed(1)} range` : `pH ${species.phMin}–${species.phMax} — narrow overlap with what you already keep`,
      });
    } else {
      rows.push({ label: "Parameters", verdict: "ok", text: `pH ${species.phMin}–${species.phMax}` });
    }
  }

  // Setup — footprint, schooling, temperament: the "does my tank suit this fish's habits" facts.
  const setupBits: string[] = [];
  if (species.minFootprintLengthCm != null && species.minFootprintWidthCm != null) {
    const ok = tank.lengthCm >= species.minFootprintLengthCm && tank.widthCm >= species.minFootprintWidthCm;
    setupBits.push(`${ok ? "✓" : "⚠"} Needs ${species.minFootprintLengthCm}×${species.minFootprintWidthCm}cm floor space`);
  }
  if (species.socialMinGroup != null && species.socialMinGroup > 1) {
    setupBits.push(`Best kept in groups of ${species.socialMinGroup}+`);
  }
  if (species.temperament) setupBits.push(`Temperament: ${species.temperament}`);
  if (species.swimLevel) setupBits.push(`Swims: ${species.swimLevel}`);
  if (setupBits.length > 0) {
    const hasWarning = setupBits.some((b) => b.startsWith("⚠"));
    rows.push({ label: "Setup", verdict: hasWarning ? "watch" : "ok", text: setupBits.join(" · ") });
  }

  return (
    <div style={{ margin: "12px 0" }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--color-line-soft)" }}>
          <span
            style={{
              flexShrink: 0,
              width: 92,
              fontSize: "var(--font-caption-size)",
              fontWeight: 700,
              color:
                r.verdict === "fixNow" ? "var(--color-fix-now)" : r.verdict === "watch" ? "var(--color-watch)" : "var(--color-improve)",
            }}
          >
            {r.label}
          </span>
          <span style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink)" }}>{r.text}</span>
        </div>
      ))}
    </div>
  );
}
