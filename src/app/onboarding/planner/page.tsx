"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { Chip } from "@/components/Chip";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { LottiePlayer } from "@/components/LottiePlayer";
import { useLiveQuery } from "@/db/live";
import { listSpecies } from "@/db/queries/species";
import { getProfile } from "@/db/queries/profile";
import {
  buildSetupPlan,
  matchCityClimate,
  GENERIC_INDIA_CLIMATE,
  SIZE_BANDS,
  type PlantedTier,
  type SetupPlan,
} from "@/lib/setup-recommendations";
import { FILTER_SUBTYPES, COMMON_CITIES } from "@/lib/common-options";
import { createTank } from "@/db/queries/tanks";
import { addEquipment } from "@/db/queries/equipment";
import { addLivestock } from "@/db/queries/livestock";
import { addPlant } from "@/db/queries/plants";
import { unlockDexCard } from "@/db/queries/dex";
import { createTask } from "@/db/queries/tasks";
import { addLogEntry } from "@/db/queries/log-entries";
import { syncReminder } from "@/lib/push-client";
import { REMINDER_PRESETS, presetRrule } from "@/lib/reminder-presets";
import { getPlannerAdvice } from "@/lib/ai-client";

type SpeciesRow = Awaited<ReturnType<typeof listSpecies>>[number];

type AiPlan = {
  summary: string;
  recommended_species_ids: string[];
  suggested_fish: { species_id: string; count?: number; why: string }[];
  suggested_plants: { species_id: string; why: string }[];
  stocking_notes: { severity: string; note: string }[];
};

// Same tiny helper every other seeding page defines inline (tank/new,
// onboarding/report, ask, emergency) — a due date N days out, ISO.
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

/**
 * T-027 — "Help me build a tank", rebuilt fish-first per Jaideep
 * (2026-09-06): "the whole point of making a tank is the fish. Tank type
 * first, then what fish they want, then size — then smart recommendations."
 *
 * Three quick choices, then the AI plans it like the expert the user
 * doesn't have yet: confirms their fish fit, suggests companions, flags
 * stocking problems, picks plants — all cited to the real catalog. The
 * deterministic engine (setup-recommendations.ts) sizes the equipment
 * instantly underneath, so numbers are on screen while the AI thinks and
 * the plan still ships if the network is down (never a dead end).
 */
export default function OnboardingPlannerPage() {
  const router = useRouter();
  const { data: allSpecies } = useLiveQuery(listSpecies, []);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 — tank type
  const [tier, setTier] = useState<PlantedTier>("planted");

  // Step 2 — the fish they want (free text, their words)
  const [wishInput, setWishInput] = useState("");
  const [wishes, setWishes] = useState<string[]>([]);

  // Step 3 — size band + city
  const [band, setBand] = useState<"small" | "medium" | "large">("medium");
  const [city, setCity] = useState("");

  // Step 4 — the plan
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [plan, setPlan] = useState<SetupPlan | null>(null);
  const [tankName, setTankName] = useState("");
  const [customRoomTemp, setCustomRoomTemp] = useState("");
  const [useCustomRoomTemp, setUseCustomRoomTemp] = useState(false);
  const [picked, setPicked] = useState<{ speciesId: string; count: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);

  // Pre-fill the city from the local profile.
  useEffect(() => {
    getProfile().then((p) => {
      if (p?.city) setCity(p.city);
    });
  }, []);

  const speciesById = useMemo(() => new Map((allSpecies ?? []).map((s) => [s.id, s])), [allSpecies]);

  const bandInfo = SIZE_BANDS[band];
  const volumeL = bandInfo.planL;
  // Working footprint for the chosen band — used for substrate/light math.
  const [planLengthCm, planWidthCm] = useMemo(() => {
    const m = bandInfo.exampleCm.match(/(\d+)×(\d+)×(\d+)/);
    return m ? [Number(m[1]), Number(m[2])] : [60, 30];
  }, [bandInfo]);

  const climate = matchCityClimate(city);
  const customTempNum = useCustomRoomTemp && customRoomTemp ? Number(customRoomTemp) : null;

  function addWish() {
    const w = wishInput.trim();
    if (!w) return;
    setWishes((prev) => (prev.some((x) => x.toLowerCase() === w.toLowerCase()) ? prev : [...prev, w]));
    setWishInput("");
  }

  async function handleBuildPlan() {
    setStep(4);
    setAiLoading(true);
    setAiError(null);
    setAiPlan(null);

    // The deterministic plan is instant — numbers on screen immediately.
    // Fish rows resolve later, once the AI's picks land (or don't).
    const basePlan = buildSetupPlan({
      volumeL,
      lengthCm: planLengthCm,
      widthCm: planWidthCm,
      tier,
      hasCo2: false,
      speciesRows: [],
      climate,
      customRoomTempC: customTempNum,
    });
    setPlan(basePlan);
    setTankName(`${bandInfo.label} ${tier === "planted" ? "planted" : tier === "hardscape" ? "hardscape" : "bare-bottom"} tank`);

    try {
      const result = await getPlannerAdvice({
        tankType: tier,
        band,
        city: city.trim(),
        wishList: wishes,
      });
      if (!result.ok) {
        setAiError(result.error);
      } else {
        const p = result.data.plan as unknown as AiPlan;
        setAiPlan(p);
        // Seed the wishlist from the AI's confirmed + suggested fish, then
        // recompute equipment for the real bioload.
        const ids = [...new Set([...p.recommended_species_ids, ...p.suggested_fish.map((f) => f.species_id)])]
          .filter((id) => speciesById.has(id))
          .map((id) => ({
            speciesId: id,
            count: p.suggested_fish.find((f) => f.species_id === id)?.count ?? 1,
          }));
        setPicked(ids);
        const rows = ids.map((i) => speciesById.get(i.speciesId)).filter((s): s is SpeciesRow => !!s);
        setPlan(
          buildSetupPlan({
            volumeL,
            lengthCm: planLengthCm,
            widthCm: planWidthCm,
            tier,
            hasCo2: false,
            speciesRows: rows,
            climate,
            customRoomTempC: customTempNum,
          })
        );
      }
    } catch {
      setAiError("Couldn't reach the advisor — showing the standard plan instead. You can save it as-is.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!plan) return;
    setSaving(true);
    setSaveError(null);
    try {
      const tankId = await createTank({
        name: tankName.trim() || `${bandInfo.label} tank`,
        lengthCm: planLengthCm,
        widthCm: planWidthCm,
        heightCm: Math.round((volumeL * 1000) / (planLengthCm * planWidthCm) * 10) / 10,
        city: city.trim() || undefined,
        isPlanted: tier === "planted",
        hasCo2: false,
        status: "planned",
        setupType: tier,
        substrate: plan.substrate.kind ?? undefined,
      });

      if (plan.heaterWatts != null) {
        await addEquipment({ tankId, type: "heater", wattage: plan.heaterWatts });
      }
      await addEquipment({ tankId, type: "filter", subtype: plan.filterSubtype, ratedLph: plan.filterFlowLph });
      await addEquipment({ tankId, type: "light", wattage: plan.lighting.wattage });

      // AI-picked plants for a planted tank.
      if (tier === "planted") {
        const plantIds = new Set((aiPlan?.suggested_plants ?? []).map((p) => p.species_id));
        for (const pid of plantIds) {
          const sp = speciesById.get(pid);
          if (sp) await addPlant({ tankId, speciesId: pid, commonName: firstName(sp.commonNames) ?? pid });
        }
      }

      // Wishlist fish as real rows with status 'planned' — they never count
      // as living in the tank until marked arrived on the Fish page.
      for (const p of picked) {
        await addLivestock({ tankId, speciesId: p.speciesId, count: p.count, status: "planned" });
        await unlockDexCard({ speciesId: p.speciesId, unlockSource: "added_to_tank" }).catch(() => {});
      }

      // Starter reminders — same presets the manual wizard seeds.
      const defaults = new Set(["water_change", "feed", "test"]);
      for (const preset of REMINDER_PRESETS) {
        if (!defaults.has(preset.type)) continue;
        const nextDueAt = daysFromNow(preset.intervalDays);
        const rrule = presetRrule(preset.intervalDays);
        const taskId = await createTask({ tankId, title: preset.label, presetType: preset.type, rrule, nextDueAt });
        await syncReminder({ taskId, title: preset.label, tankId, tankName: tankName.trim() || `${bandInfo.label} tank`, dueAt: nextDueAt, rrule }).catch(() => {});
      }

      const planLines = [
        `Setup plan (${tier}, ${bandInfo.label} ${bandInfo.minL}–${bandInfo.maxL}L)`,
        plan.heaterWatts != null ? `Heater: ${plan.heaterWatts}W` : "Heater: not needed",
        `Filter: ${plan.filterSubtype.replace(/_/g, " ")}, ~${plan.filterFlowLph} L/h`,
        `Light: ~${plan.lighting.wattage}W (${plan.lighting.level})`,
        plan.substrate.kind ? `Substrate: ${plan.substrate.kind}, ${plan.substrate.depthCm}cm (~${plan.substrate.approxKg}kg)` : "Substrate: none",
        picked.length ? `Wishlist: ${picked.map((p) => `${p.count}× ${firstName(speciesById.get(p.speciesId)?.commonNames) ?? p.speciesId}`).join(", ")}` : "Wishlist: none yet",
        aiPlan ? `Advisor: ${aiPlan.summary}` : "Advisor: offline — standard plan",
      ];
      await addLogEntry({ tankId, type: "journal", body: planLines.join(" · ") });

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setSavedOffline(true);
        setSaving(false);
        return;
      }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full-page nav, not an SPA transition: it must survive aeroplane mode.
      window.location.assign(`/tank/${tankId}`);
    } catch (err) {
      setSaveError(`Something went wrong saving your plan: ${String(err)}`);
      setSaving(false);
    }
  }

  // ---- Step 1 — what kind of tank ------------------------------------------
  if (step === 1) {
    return (
      <Screen
        footer={
          <PrimaryButton onClick={() => setStep(2)}>Next — what fish do you want?</PrimaryButton>
        }
      >
        <BackHeader title="Help me build a tank" fallbackHref="/" />
        <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>Three quick questions, then we&apos;ll plan the whole thing together.</p>

        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>What kind of tank do you want?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              [
                ["planted", "🌿 Planted", "Live plants growing in the tank — the classic aquascape"],
                ["hardscape", "🪨 Hardscape", "Rocks and driftwood only — no plants to trim"],
                ["bare_bottom", "🫙 Bare bottom", "No substrate at all — easiest to clean"],
              ] as [PlantedTier, string, string][]
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTier(value)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${tier === value ? "var(--color-deep)" : "var(--color-line)"}`,
                  background: tier === value ? "var(--color-deep-soft, rgba(0,0,0,0.04))" : "transparent",
                  color: "var(--color-ink)",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "block", fontWeight: 700 }}>{label}</span>
                <span style={{ display: "block", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 2 }}>{hint}</span>
              </button>
            ))}
          </div>
        </Card>
      </Screen>
    );
  }

  // ---- Step 2 — what fish do you want to keep -------------------------------
  if (step === 2) {
    return (
      <Screen
        footer={
          <>
            <PrimaryButton onClick={() => setStep(3)}>Next — how big?</PrimaryButton>
            <SecondaryButton onClick={() => setStep(1)}>Back</SecondaryButton>
          </>
        }
      >
        <BackHeader title="Help me build a tank" fallbackHref="/" />
        <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
          This is the fun part — what fish do you imagine in it? Type anything: a species (&quot;betta&quot;), a vibe (&quot;lots of tiny colourful schooling fish&quot;), or a colour.
        </p>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Field
              label=""
              placeholder="e.g. guppies, or red shrimp, or a big centerpiece fish…"
              value={wishInput}
              onChange={(e) => setWishInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addWish();
                }
              }}
            />
            <SecondaryButton style={{ width: "auto", padding: "8px 16px" }} onClick={addWish}>
              Add
            </SecondaryButton>
          </div>

          {wishes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {wishes.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWishes((prev) => prev.filter((x) => x !== w))}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--color-deep)", background: "var(--color-deep-soft, rgba(0,0,0,0.04))", fontSize: "var(--font-caption-size)", fontWeight: 600 }}
                >
                  {w} ✕
                </button>
              ))}
            </div>
          )}

          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 12, marginBottom: 6 }}>
            Not sure yet? These are proven first fish:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["guppies", "neon tetras", "a betta", "cherry shrimp", "corydoras", "harlequin rasboras"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setWishes((prev) => (prev.some((x) => x.toLowerCase() === s) ? prev : [...prev, s]))}
                style={{ padding: "6px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--color-line)", background: "var(--color-surface)", fontSize: "var(--font-caption-size)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      </Screen>
    );
  }

  // ---- Step 3 — how big + where --------------------------------------------
  if (step === 3) {
    return (
      <Screen
        footer={
          <>
            <PrimaryButton onClick={handleBuildPlan} disabled={aiLoading}>
              {aiLoading ? "Planning…" : "Build my plan"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setStep(2)}>Back</SecondaryButton>
          </>
        }
      >
        <BackHeader title="Help me build a tank" fallbackHref="/" />
        <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
          Bigger tanks are more forgiving for beginners — water stays stable longer. Pick what fits your space.
        </p>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(Object.keys(SIZE_BANDS) as ("small" | "medium" | "large")[]).map((key) => {
              const b = SIZE_BANDS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBand(key)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `1px solid ${band === key ? "var(--color-deep)" : "var(--color-line)"}`,
                    background: band === key ? "var(--color-deep-soft, rgba(0,0,0,0.04))" : "transparent",
                    color: "var(--color-ink)",
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "block", fontWeight: 700 }}>
                    {b.label} · {b.minL}–{b.maxL}L
                  </span>
                  <span style={{ display: "block", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 2 }}>
                    {b.hint} — around {b.exampleCm}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <Field label="Your city (for heater sizing)" list="planner-city-options" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" />
          <datalist id="planner-city-options">
            {COMMON_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 4 }}>
            Used to pick a heater that can hold temperature in your winters. Optional.
          </p>
        </Card>
      </Screen>
    );
  }

  // ---- Step 4 — the plan -----------------------------------------------------
  if (!plan) return null;
  const roomTempSource =
    plan.roomTempUsed?.source === "your home"
      ? "your own room temperature"
      : climate
        ? `typical ${climate.band} indoor temperatures`
        : "typical India-wide indoor temperatures";

  return (
    <Screen
      footer={
        savedOffline ? (
          <>
            <PrimaryButton onClick={() => router.push("/")}>Go to My Tanks</PrimaryButton>
            <SecondaryButton onClick={() => router.push("/onboarding/scan")}>I&apos;ve set the tank up — scan it now</SecondaryButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save to My Tanks"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setStep(3)} disabled={saving}>
              Back — change size or city
            </SecondaryButton>
          </>
        )
      }
    >
      <BackHeader title="Your setup plan" fallbackHref="/" />

      {savedOffline ? (
        <>
          <Banner severity="improve">
            Plan saved. You&apos;re offline right now, so the tank page couldn&apos;t load — your tank is safe on this phone and will open normally once you&apos;re back online.
          </Banner>
          <p style={{ color: "var(--color-ink-muted)", marginTop: 12 }}>
            Everything you planned — equipment, wishlist fish, and three starter reminders — is already on this device.
          </p>
        </>
      ) : (
        <>
          {/* The AI's expert read — the heart of the plan */}
          {aiLoading && (
            <Card style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <LottiePlayer name="thinking" size={48} />
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
                Our advisor is checking your fish list against the catalog…
              </p>
            </Card>
          )}

          {aiError && !aiPlan && (
            <div style={{ marginBottom: 12 }}>
              <Banner severity="watch">{aiError}</Banner>
            </div>
          )}

          {aiPlan && (
            <Card style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>🐠 The advisor says</p>
              <p style={{ fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>{aiPlan.summary}</p>
              {aiPlan.stocking_notes.map((n, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <Banner severity={n.severity === "warning" ? "fixNow" : n.severity === "watch" ? "watch" : "neutral"}>{n.note}</Banner>
                </div>
              ))}
              {aiPlan.suggested_fish.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 4 }}>Suggested for your tank:</p>
                  {aiPlan.suggested_fish.map((f) => {
                    const sp = speciesById.get(f.species_id);
                    return (
                      <div key={f.species_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <SpeciesThumb imageUri={sp?.imageUri} category={sp?.category} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>
                            {(f.count ?? 1) > 1 ? `${f.count}× ` : ""}
                            {firstName(sp?.commonNames ?? null) ?? f.species_id}
                          </p>
                          <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{f.why}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {aiPlan.suggested_plants.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 4 }}>Plants that will thrive here:</p>
                  {aiPlan.suggested_plants.map((p) => {
                    const sp = speciesById.get(p.species_id);
                    return (
                      <div key={p.species_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <SpeciesThumb imageUri={sp?.imageUri} category={sp?.category} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>{firstName(sp?.commonNames ?? null) ?? p.species_id}</p>
                          <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{p.why}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* The equipment plan — instant, deterministic, editable via band/room-temp */}
          <Card style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Tank name</p>
            <Field label="" value={tankName} onChange={(e) => setTankName(e.target.value)} placeholder={`${bandInfo.label} tank`} />
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 6 }}>
              {tier === "planted" ? "Planted" : tier === "hardscape" ? "Hardscape" : "Bare-bottom"} · {bandInfo.label} ({bandInfo.minL}–{bandInfo.maxL}L, planned around {volumeL}L)
            </p>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontWeight: 600 }}>🌡️ Heater</p>
              {plan.heaterWatts == null ? (
                <Chip variant="improve">Not needed</Chip>
              ) : (
                <span style={{ fontWeight: 700 }}>{plan.heaterWatts}W</span>
              )}
            </div>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 6 }}>
              {plan.heaterWatts == null
                ? "Your room stays warm enough that a heater may never switch on."
                : `For a room around ${plan.roomTempUsed?.value}°C (${roomTempSource}).`}
            </p>
            {plan.heaterNote && (
              <div style={{ marginTop: 8 }}>
                <Banner severity="watch">{plan.heaterNote}</Banner>
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: "var(--font-body-sm-size)" }}>
              <input
                type="checkbox"
                checked={useCustomRoomTemp}
                onChange={(e) => {
                  setUseCustomRoomTemp(e.target.checked);
                  const t = customRoomTemp ? Number(customRoomTemp) : null;
                  const rows = picked.map((i) => speciesById.get(i.speciesId)).filter((s): s is SpeciesRow => !!s);
                  setPlan(
                    buildSetupPlan({
                      volumeL,
                      lengthCm: planLengthCm,
                      widthCm: planWidthCm,
                      tier,
                      hasCo2: false,
                      speciesRows: rows,
                      climate,
                      customRoomTempC: e.target.checked ? t : null,
                    })
                  );
                }}
              />
              I know my room&apos;s temperature
            </label>
            {useCustomRoomTemp && (
              <div style={{ marginTop: 8 }}>
                <Field
                  label="Room temperature in winter (°C)"
                  type="number"
                  value={customRoomTemp}
                  onChange={(e) => setCustomRoomTemp(e.target.value)}
                  placeholder={`e.g. ${(climate ?? GENERIC_INDIA_CLIMATE).winterLowC}`}
                />
                <SecondaryButton
                  style={{ width: "auto", padding: "6px 14px", marginTop: 4 }}
                  onClick={() => {
                    const t = customRoomTemp ? Number(customRoomTemp) : null;
                    const rows = picked.map((i) => speciesById.get(i.speciesId)).filter((s): s is SpeciesRow => !!s);
                    setPlan(
                      buildSetupPlan({
                        volumeL,
                        lengthCm: planLengthCm,
                        widthCm: planWidthCm,
                        tier,
                        hasCo2: false,
                        speciesRows: rows,
                        climate,
                        customRoomTempC: t,
                      })
                    );
                  }}
                >
                  Update heater size
                </SecondaryButton>
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontWeight: 600 }}>💧 Filter</p>
              <span style={{ fontWeight: 700 }}>{plan.filterFlowLph} L/h</span>
            </div>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 6 }}>
              A {FILTER_SUBTYPES.find((f) => f.value === plan.filterSubtype)?.label ?? plan.filterSubtype} filter turning the water over about {Math.round((plan.filterFlowLph / volumeL) * 10) / 10}× per hour.
            </p>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontWeight: 600 }}>💡 Light</p>
              <span style={{ fontWeight: 700 }}>{plan.lighting.wattage}W</span>
            </div>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 6 }}>
              {plan.lighting.level} light, ~{plan.lighting.fixtureLengthCm}cm fixture
              {tier === "planted" ? " — enough for easy plants" : ""}.
            </p>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 600 }}>🪨 Substrate</p>
            {plan.substrate.kind == null ? (
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 6 }}>None needed for a bare-bottom tank.</p>
            ) : (
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 6 }}>
                {plan.substrate.kind}, {plan.substrate.depthCm}cm deep — about {plan.substrate.approxKg}kg for this footprint.
              </p>
            )}
          </Card>

          {picked.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Fish on your wishlist</p>
              {picked.map((p) => {
                const s = speciesById.get(p.speciesId);
                return (
                  <div key={p.speciesId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <SpeciesThumb imageUri={s?.imageUri} category={s?.category} size={28} />
                    <span style={{ flex: 1, fontSize: "var(--font-body-sm-size)" }}>
                      {p.count}× {firstName(s?.commonNames ?? null) ?? p.speciesId}
                    </span>
                    <Chip variant="neutral">planned</Chip>
                  </div>
                );
              })}
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 6 }}>
                Saved as a wishlist — they only count as &quot;in the tank&quot; once you mark them arrived on the tank&apos;s Fish page.
              </p>
            </Card>
          )}

          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 16 }}>
            Saving creates the tank as <strong>Planned</strong> with three starter reminders (water change, feed, test water). You can adjust everything later.
          </p>

          {saveError && <Banner severity="fixNow">{saveError}</Banner>}
        </>
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
