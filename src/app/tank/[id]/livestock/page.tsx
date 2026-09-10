"use client";

import { use, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { Chip } from "@/components/Chip";
import { Field } from "@/components/Field";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { useLiveQuery } from "@/db/live";
import { downscaleForUpload } from "@/lib/image-quality/browser";
import { getTank } from "@/db/queries/tanks";
import { listLivestockForTank, listPlannedLivestockForTank, addLivestock, removeLivestock, recordDeath, updateLivestockCount, markLivestockArrived, listLivestockEvents } from "@/db/queries/livestock";
import { listSpecies, searchSpecies, insertGeneratedSpecies } from "@/db/queries/species";
import { unlockDexCard } from "@/db/queries/dex";
import { checkSchoolingMinimums } from "@/lib/derived-checks";
import { checkCompat, generateSpecies, identifySpecies } from "@/lib/ai-client";
import { dismissWarning, isWarningDismissed, compatWarningKey } from "@/db/queries/dismissed-warnings";
import { DexUnlockToast } from "@/components/DexUnlockToast";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { isAiGenerated } from "@/lib/species-origin";

type SpeciesRow = Awaited<ReturnType<typeof listSpecies>>[number];
type CompatConflict = { type: string; severity: string; explanation: string; with: string[]; mitigation: string };

export default function TankLivestockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);
  const { data: livestock } = useLiveQuery(() => listLivestockForTank(id), [id]);

  // Captured once, the first time livestock loads, so the "already in this
  // tank" vs "added just now" split (below) stays stable across this visit
  // even as new rows get added. Not a state update — a lazy-init ref
  // written during render is the normal React pattern for this.
  const initialAliveRef = useRef<{ id: string; speciesId: string }[] | null>(null);
  if (livestock && initialAliveRef.current === null) {
    initialAliveRef.current = livestock.filter((l) => l.status === "alive").map((l) => ({ id: l.id, speciesId: l.speciesId }));
  }
  const { data: plannedLivestock } = useLiveQuery(() => listPlannedLivestockForTank(id), [id]);
  const { data: allSpecies } = useLiveQuery(listSpecies, []);

  const speciesById = new Map((allSpecies ?? []).map((s) => [s.id, s]));

  // Lets the tank overview's "+ Add fish" card link straight into the add
  // form (/tank/[id]/livestock?add=1) instead of landing on the plain list.
  const [showAdd, setShowAdd] = useState(searchParams.get("add") === "1");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpeciesRow[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [count, setCount] = useState("1");
  const [nickname, setNickname] = useState("");
  const [showNickname, setShowNickname] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<{ species_id: string | null; common_name: string; scientific_name: string; confidence: number; why: string }[] | null>(null);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Compatibility now runs once, in a single batch, when leaving via "Done"
  // — not per fish while adding (Jaideep, 2026-09-10: it interrupted the add
  // flow, and a one-at-a-time check can never catch a conflict between two
  // fish added in the same visit, only new-vs-already-saved).
  const [sessionAddedSpeciesIds, setSessionAddedSpeciesIds] = useState<string[]>([]);
  const [doneChecking, setDoneChecking] = useState(false);
  const [doneCompatResult, setDoneCompatResult] = useState<{ verdict: string; conflicts: CompatConflict[]; footprintNote: string } | null>(null);
  const [doneDismissedKeys, setDoneDismissedKeys] = useState<Set<string>>(new Set());

  async function handleSearch(value: string) {
    setQuery(value);
    setSelectedSpeciesId(null);
    setCandidates(null);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchResults(await searchSpecies(value));
  }

  function selectSpecies(speciesId: string) {
    setSelectedSpeciesId(speciesId);
    setSearchResults([]);
    setCandidates(null);
  }

  async function handleIdentifyPhoto(file: File) {
    setBusy("identify");
    setCandidates(null);
    const upload = await downscaleForUpload(file);
    const result = await identifySpecies(upload);
    setBusy(null);
    if (!result.ok) {
      setGenError(result.error);
      return;
    }
    const data = result.data.speciesId as unknown as {
      candidates: { species_id: string | null; common_name: string; scientific_name: string; confidence: number; why: string }[];
    };
    setCandidates(data.candidates);
  }

  /** An identified candidate that isn't in our catalog — route it through the same "add anyway" (species-gen) flow as a manual search miss, prefilled with the AI's guess at the name. */
  function suggestCandidateAnyway(commonName: string) {
    handleSearch(commonName);
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
    const id = await insertGeneratedSpecies({ species: data.species, uncertaintyNote: data.uncertainty_note, confidence: data.confidence, flags: data.flags });
    selectSpecies(id);
  }

  /** "Done — go to my tank": if anything was added this visit, run one batch
   *  compatibility check (existing-before-this-visit fish vs everything just
   *  added) and show it before navigating; otherwise there's nothing new to
   *  check, so just go. Never blocks leaving either way — Principle 01. */
  async function handleDone() {
    if (doneCompatResult) {
      router.push(`/tank/${id}`);
      return;
    }
    if (!tank || sessionAddedSpeciesIds.length === 0) {
      router.push(`/tank/${id}`);
      return;
    }
    setDoneChecking(true);
    const existingSpeciesIds = Array.from(new Set((initialAliveRef.current ?? []).map((r) => r.speciesId)));
    const newSpeciesIds = Array.from(new Set(sessionAddedSpeciesIds));
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
      // Never block the save — Principle 01. Just go rather than dead-ending on a failed check.
      router.push(`/tank/${id}`);
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
    const newSpeciesIds = Array.from(new Set(sessionAddedSpeciesIds));
    const key = compatWarningKey(newSpeciesIds, conflict.type, conflict.with);
    await dismissWarning({ tankId: id, warningKey: key });
    setDoneDismissedKeys((prev) => new Set(prev).add(key));
  }

  async function handleConfirmAdd() {
    if (!selectedSpeciesId || !count) return;
    const species = speciesById.get(selectedSpeciesId);
    await addLivestock({ tankId: id, speciesId: selectedSpeciesId, count: Number(count), nickname: nickname.trim() || undefined });
    setSessionAddedSpeciesIds((prev) => [...prev, selectedSpeciesId]);
    const { isNewUnlock } = await unlockDexCard({ speciesId: selectedSpeciesId, unlockSource: "added_to_tank" });
    if (isNewUnlock) {
      setUnlockToast(firstName(species?.commonNames) ?? selectedSpeciesId);
    }
    setShowAdd(false);
    setQuery("");
    setSelectedSpeciesId(null);
    setCount("1");
    setNickname("");
    setShowNickname(false);
    setCandidates(null);
  }

  if (!tank) return <Screen>Loading...</Screen>;

  const aliveLivestock = (livestock ?? []).filter((l) => l.status === "alive");
  const schoolingWarnings = checkSchoolingMinimums(aliveLivestock, speciesById);
  const selectedSpecies = selectedSpeciesId ? speciesById.get(selectedSpeciesId) : null;

  const initialAliveIds = new Set((initialAliveRef.current ?? []).map((r) => r.id));
  const existingRows = aliveLivestock.filter((l) => initialAliveIds.has(l.id));
  const newRows = aliveLivestock.filter((l) => !initialAliveIds.has(l.id));

  return (
    <Screen
      footer={
        <>
          <PrimaryButton onClick={handleDone} disabled={doneChecking}>
            {doneChecking ? "Checking compatibility..." : doneCompatResult ? "Continue to my tank" : "Done — go to my tank"}
          </PrimaryButton>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", textAlign: "center" }}>
            You can always add more fish later from here.
          </p>
        </>
      }
    >
      {unlockToast && <DexUnlockToast speciesName={unlockToast} onDismiss={() => setUnlockToast(null)} />}
      <BackHeader title="Fish" fallbackHref={`/tank/${id}`} />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>{tank.name}</p>

      {schoolingWarnings.map((w) => (
        <div key={w.key} style={{ marginBottom: 8 }}>
          <Banner severity={w.severity}>{w.message}</Banner>
        </div>
      ))}

      {doneCompatResult && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Compatibility check</p>
          {doneCompatResult.conflicts.filter((c) => !doneDismissedKeys.has(compatWarningKey(Array.from(new Set(sessionAddedSpeciesIds)), c.type, c.with))).length === 0 && (
            <Banner severity="improve">No conflicts found between your fish.</Banner>
          )}
          {doneCompatResult.conflicts
            .filter((c) => !doneDismissedKeys.has(compatWarningKey(Array.from(new Set(sessionAddedSpeciesIds)), c.type, c.with)))
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
        </Card>
      )}

      {!showAdd && <PrimaryButton onClick={() => setShowAdd(true)}>+ Add Fish</PrimaryButton>}

      {showAdd && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Field label="Search species" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="e.g. neon tetra" />
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              aria-label="Cancel"
              style={{ background: "none", border: "none", color: "var(--color-ink-muted)", fontSize: 20, lineHeight: 1, padding: "4px 4px 0", marginTop: 22 }}
            >
              ✕
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSpecies(s.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: 8, border: "1px solid var(--color-line)", borderRadius: 6, marginBottom: 4, background: "var(--color-surface)" }}
                >
                  <SpeciesThumb imageUri={s.imageUri} category={s.category} />
                  <span>
                    {firstName(s.commonNames) ?? s.id} {isAiGenerated(s) && <Chip variant="unverified">AI-generated</Chip>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {query.trim().length >= 2 && searchResults.length === 0 && !selectedSpeciesId && (
            <div style={{ marginTop: 8 }}>
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>
                Not in our catalog yet.
              </p>
              <SecondaryButton onClick={handleAddItAnyway} disabled={busy === "generate"}>
                {busy === "generate" ? "Generating a card..." : `Add "${query}" anyway`}
              </SecondaryButton>
            </div>
          )}

          <div style={{ margin: "10px 0" }}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleIdentifyPhoto(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={busy === "identify"}
              style={{ background: "none", border: "none", color: "var(--color-deep)", fontWeight: 600, fontSize: "var(--font-caption-size)", padding: 0 }}
            >
              {busy === "identify" ? "Identifying..." : "📷 Not sure? Identify it from a photo"}
            </button>
          </div>

          {candidates && candidates.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600, marginBottom: 4 }}>
                Our best guesses — may or may not be in our catalog:
              </p>
              {candidates.map((c, i) =>
                c.species_id ? (
                  <button
                    key={i}
                    onClick={() => selectSpecies(c.species_id!)}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: 8, border: "1px solid var(--color-line)", borderRadius: 6, marginBottom: 4, background: "var(--color-surface)" }}
                  >
                    <SpeciesThumb imageUri={speciesById.get(c.species_id)?.imageUri} category={speciesById.get(c.species_id)?.category} />
                    <span>
                      {c.common_name} {c.confidence < 0.5 && <Chip variant="watch">low confidence</Chip>}
                      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: 0 }}>{c.why}</p>
                    </span>
                  </button>
                ) : (
                  <div key={i} style={{ padding: 8, border: "1px solid var(--color-line)", borderRadius: 6, marginBottom: 4, background: "var(--color-surface)" }}>
                    <p style={{ margin: 0 }}>
                      {c.common_name} <span style={{ color: "var(--color-ink-muted)", fontStyle: "italic", fontSize: "var(--font-caption-size)" }}>{c.scientific_name}</span>
                    </p>
                    <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "2px 0 6px" }}>{c.why}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Chip variant="watch">Not in our catalog</Chip>
                      <button
                        type="button"
                        onClick={() => suggestCandidateAnyway(c.common_name)}
                        style={{ background: "none", border: "none", color: "var(--color-deep)", fontWeight: 600, fontSize: "var(--font-caption-size)" }}
                      >
                        Add it anyway
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
          {candidates && candidates.length === 0 && (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>
              Couldn&apos;t identify this one confidently. Try a clearer photo, or search by name above and use &quot;Add anyway&quot;.
            </p>
          )}

          {genError && <Banner severity="watch">{genError}</Banner>}

          {selectedSpeciesId && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--color-line)", paddingTop: 12 }}>
              <p style={{ fontWeight: 600 }}>
                {firstName(selectedSpecies?.commonNames ?? null) ?? selectedSpeciesId}{" "}
                {selectedSpecies && isAiGenerated(selectedSpecies) && <Chip variant="unverified">AI-generated</Chip>}
              </p>
              <Field label="Count" type="number" value={count} onChange={(e) => setCount(e.target.value)} />
              <div style={{ height: 8 }} />
              {showNickname || nickname ? (
                <Field label="Nickname (optional)" value={nickname} onChange={(e) => setNickname(e.target.value)} autoFocus={showNickname} />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNickname(true)}
                  style={{ background: "none", border: "none", color: "var(--color-deep)", fontWeight: 600, fontSize: "var(--font-caption-size)", padding: 0 }}
                >
                  + Give it a nickname
                </button>
              )}
              <div style={{ height: 12 }} />

              <PrimaryButton onClick={handleConfirmAdd}>Add to tank</PrimaryButton>
            </div>
          )}

        </Card>
      )}

      <div style={{ height: 16 }} />

      {aliveLivestock.length === 0 && <p style={{ color: "var(--color-ink-muted)" }}>No fish added yet.</p>}

      {newRows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8, color: "var(--color-deep)" }}>Added just now</p>
          {newRows.map((l) => (
            <LivestockRow key={l.id} livestock={l} species={speciesById.get(l.speciesId)} />
          ))}
        </div>
      )}

      {existingRows.length > 0 && (
        <div>
          {newRows.length > 0 && <p style={{ fontWeight: 600, marginBottom: 8 }}>Already in this tank</p>}
          {existingRows.map((l) => (
            <LivestockRow key={l.id} livestock={l} species={speciesById.get(l.speciesId)} />
          ))}
        </div>
      )}

      {(plannedLivestock ?? []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>On the wishlist — not in the tank yet</p>
          {(plannedLivestock ?? []).map((l) => (
            <PlannedLivestockRow key={l.id} livestock={l} species={speciesById.get(l.speciesId)} />
          ))}
        </div>
      )}
    </Screen>
  );
}

function firstName(json: string | null | undefined): string | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
  } catch {
    return null;
  }
}

/** A wishlist fish from the guided planner (T-027) — "Mark as arrived" flips it to a real, counted fish the day it comes home. */
function PlannedLivestockRow({
  livestock,
  species,
}: {
  livestock: { id: string; speciesId: string; count: number; nickname: string | null; addedOn: string };
  species: SpeciesRow | undefined;
}) {
  const [arriving, setArriving] = useState(false);
  return (
    <Card style={{ marginBottom: 8, borderStyle: "dashed" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <SpeciesThumb imageUri={species?.imageUri} category={species?.category} size={36} />
          <div style={{ minWidth: 0 }}>
            <strong>
              {firstName(species?.commonNames) ?? livestock.speciesId} × {livestock.count}
            </strong>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>Planned — not added to the tank yet</p>
          </div>
        </div>
        <SecondaryButton
          style={{ width: "auto", padding: "6px 12px", flexShrink: 0 }}
          disabled={arriving}
          onClick={async () => {
            setArriving(true);
            await markLivestockArrived(livestock.id);
          }}
        >
          {arriving ? "..." : "Arrived"}
        </SecondaryButton>
      </div>
    </Card>
  );
}

function LivestockRow({
  livestock,
  species,
}: {
  livestock: { id: string; speciesId: string; count: number; nickname: string | null; addedOn: string };
  species: SpeciesRow | undefined;
}) {
  const [editingCount, setEditingCount] = useState(false);
  const [countValue, setCountValue] = useState(String(livestock.count));
  const [showDeathForm, setShowDeathForm] = useState(false);
  const [deathCause, setDeathCause] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { data: events } = useLiveQuery(() => listLivestockEvents(livestock.id), [livestock.id]);

  async function saveCount() {
    await updateLivestockCount(livestock.id, Number(countValue));
    setEditingCount(false);
  }

  async function confirmDeath() {
    await recordDeath(livestock.id, deathCause.trim() || undefined);
    setShowDeathForm(false);
  }

  return (
    <Card style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SpeciesThumb imageUri={species?.imageUri} category={species?.category} size={36} />
          <div>
            <strong>
              {firstName(species?.commonNames) ?? livestock.speciesId} {isAiGenerated(species) && <Chip variant="unverified">AI-generated</Chip>}
            </strong>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
              {livestock.nickname ? `"${livestock.nickname}" · ` : ""}
              added {new Date(livestock.addedOn).toLocaleDateString()}
            </p>
          </div>
        </div>
        {editingCount ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="number"
              value={countValue}
              onChange={(e) => setCountValue(e.target.value)}
              style={{ width: 60, padding: 4 }}
            />
            <SecondaryButton style={{ width: "auto", padding: "4px 8px" }} onClick={saveCount}>
              Save
            </SecondaryButton>
          </div>
        ) : (
          <button onClick={() => setEditingCount(true)} style={{ background: "none", border: "none", fontWeight: 600, fontSize: 16 }}>
            × {livestock.count}
          </button>
        )}
      </div>

      {!showActions ? (
        <button
          type="button"
          onClick={() => setShowActions(true)}
          style={{ background: "none", border: "none", color: "var(--color-ink-muted)", fontWeight: 600, fontSize: "var(--font-caption-size)", padding: 0, marginTop: 8 }}
        >
          •••  Manage
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setShowDeathForm((v) => !v)}>
            Record death
          </SecondaryButton>
          <DangerButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => removeLivestock(livestock.id)}>
            Remove
          </DangerButton>
          <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setShowTimeline((v) => !v)}>
            {showTimeline ? "Hide timeline" : "View timeline"}
          </SecondaryButton>
        </div>
      )}

      {showTimeline && (
        <div style={{ marginTop: 8, borderTop: "1px solid var(--color-line)", paddingTop: 8 }}>
          {(events ?? []).map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: "var(--font-body-sm-size)" }}>
              <span style={{ color: "var(--color-ink-muted)", minWidth: 80 }}>{new Date(e.occurredAt).toLocaleDateString()}</span>
              <span style={{ textTransform: "capitalize" }}>
                {e.type}
                {e.note ? ` — ${e.note}` : ""}
              </span>
            </div>
          ))}
          {(events ?? []).length === 0 && <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>No events yet.</p>}
        </div>
      )}

      {showDeathForm && (
        <div style={{ marginTop: 8 }}>
          <Field label="What happened? (optional)" value={deathCause} onChange={(e) => setDeathCause(e.target.value)} placeholder="No need to guess if you're not sure" />
          <div style={{ height: 8 }} />
          <SecondaryButton onClick={confirmDeath}>Confirm</SecondaryButton>
        </div>
      )}
    </Card>
  );
}
