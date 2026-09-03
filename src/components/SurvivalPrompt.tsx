"use client";

// T-026's "still doing well?" check-in. Mounted once, globally (TabsLayout),
// so it can surface regardless of which tab someone's on. Tone is the whole
// design problem here (per the spec) — no streaks, no score, and it must be
// trivially skippable and permanently turn-off-able. See specs/T-026.
import { useEffect, useState } from "react";
import { Card } from "./Card";
import { PrimaryButton, SecondaryButton } from "./Button";
import { Field } from "./Field";
import { listAllLivestock, recordDeath } from "@/db/queries/livestock";
import { listSpecies } from "@/db/queries/species";
import {
  isSurvivalPromptDisabled,
  getSurvivalPromptLastShownAt,
  markSurvivalPromptShownNow,
  getSurvivalAskedMap,
  markSurvivalAsked,
  disableSurvivalPromptForever,
} from "@/db/queries/settings";

const GLOBAL_COOLDOWN_DAYS = 14;
const PER_FISH_COOLDOWN_DAYS = 30;
const ELIGIBLE_AFTER_DAYS = 90;
const DAY_MS = 86400000;

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / DAY_MS;
}

function parseCommonName(json: string | null | undefined, fallbackId: string): string {
  if (!json) return fallbackId.replace(/-/g, " ");
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) && arr[0] ? arr[0] : fallbackId.replace(/-/g, " ");
  } catch {
    return fallbackId.replace(/-/g, " ");
  }
}

type Candidate = { livestockId: string; label: string };

export function SurvivalPrompt() {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [stage, setStage] = useState<"ask" | "cause" | "done">("ask");
  const [cause, setCause] = useState("");

  useEffect(() => {
    (async () => {
      if (await isSurvivalPromptDisabled()) return;

      const lastShown = await getSurvivalPromptLastShownAt();
      if (lastShown && daysAgo(lastShown) < GLOBAL_COOLDOWN_DAYS) return;

      const [allLivestock, allSpecies, askedMap] = await Promise.all([listAllLivestock(), listSpecies(), getSurvivalAskedMap()]);
      const speciesNames = new Map(allSpecies.map((s) => [s.id, parseCommonName(s.commonNames, s.id)]));

      const eligible = allLivestock
        .filter((l) => (l.status === "alive" || l.status === "unknown") && daysAgo(l.addedOn) >= ELIGIBLE_AFTER_DAYS)
        .filter((l) => {
          const asked = askedMap[l.id];
          return !asked || daysAgo(asked) >= PER_FISH_COOLDOWN_DAYS;
        })
        .sort((a, b) => a.addedOn.localeCompare(b.addedOn));

      const first = eligible[0];
      if (!first) return;

      const speciesName = speciesNames.get(first.speciesId) ?? first.speciesId.replace(/-/g, " ");
      const label = first.nickname ? `${first.nickname} (${speciesName})` : first.count > 1 ? `your ${speciesName}` : speciesName;
      setCandidate({ livestockId: first.id, label });
    })();
  }, []);

  if (!candidate || stage === "done") return null;

  async function dismiss() {
    if (!candidate) return;
    await markSurvivalPromptShownNow();
    await markSurvivalAsked(candidate.livestockId);
    setStage("done");
  }

  async function handleYesOrUnsure() {
    await dismiss();
  }

  async function handleGone() {
    setStage("cause");
  }

  async function confirmGone() {
    if (!candidate) return;
    await recordDeath(candidate.livestockId, cause.trim() || undefined);
    await markSurvivalPromptShownNow();
    await markSurvivalAsked(candidate.livestockId);
    setStage("done");
  }

  async function turnOffForever() {
    await disableSurvivalPromptForever();
    setStage("done");
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(var(--dock-clearance) + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
        zIndex: 40,
      }}
    >
      <Card
        style={{
          maxWidth: 420,
          width: "100%",
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          borderColor: "var(--glass-border)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        {stage === "ask" ? (
          <>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Still doing well?</p>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
              Just checking in on {candidate.label} — added over 90 days ago.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PrimaryButton onClick={handleYesOrUnsure}>Yes, doing well</PrimaryButton>
              <SecondaryButton onClick={handleGone}>No longer with me</SecondaryButton>
              <SecondaryButton onClick={handleYesOrUnsure}>Not sure</SecondaryButton>
            </div>
            <button
              onClick={turnOffForever}
              style={{ background: "none", border: "none", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 12, textDecoration: "underline", cursor: "pointer" }}
            >
              Don&apos;t ask me this again
            </button>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Sorry to hear that.</p>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
              No pressure to explain — this is just for your own records if you want it.
            </p>
            <Field label="What happened? (optional)" value={cause} onChange={(e) => setCause(e.target.value)} />
            <div style={{ height: 8 }} />
            <PrimaryButton onClick={confirmGone}>Save</PrimaryButton>
          </>
        )}
      </Card>
    </div>
  );
}
