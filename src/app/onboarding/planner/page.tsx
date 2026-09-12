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
  TANK_LENGTHS_FT,
  cubeAvailable,
  tankDimensions,
  type PlantedTier,
  type SetupPlan,
  type TankShape,
} from "@/lib/setup-recommendations";
import { COMMON_CITIES } from "@/lib/common-options";
import { createTank } from "@/db/queries/tanks";
import { addEquipment } from "@/db/queries/equipment";
import { addLivestock } from "@/db/queries/livestock";
import { addPlant } from "@/db/queries/plants";
import { unlockDexCard } from "@/db/queries/dex";
import { addLogEntry } from "@/db/queries/log-entries";
import { getPlannerAdvice } from "@/lib/ai-client";

type SpeciesRow = Awaited<ReturnType<typeof listSpecies>>[number];

type AiPlan = {
  summary: string;
  recommended_species_ids: string[];
  suggested_fish: { species_id: string; count?: number; why: string }[];
  suggested_plants: { species_id: string; why: string }[];
  stocking_notes: { severity: string; note: string }[];
};

/** Two-line clamp for advisor suggestion rows (Jaideep, 2026-09-06: "don't keep more than 2 lines"). */
const twoLineClamp: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

/**
 * T-027 — "Help me build a tank", AI-first (Jaideep's re-spec), tuned by
 * his live feedback (2026-09-06): fish typing shows instant catalog
 * suggestions; tank size is in FEET with cube/long shapes (how tanks are
 * actually sold in India); advisor suggestion rows clamp to 2 lines; the
 * heater section shows the city's temp RANGE so "18°C" reads as winter
 * nights; filters are recommended by TYPE (hang-on-back / canister /
 * sponge), never L/h; substrate names aquasoil explicitly.
 */
export default function OnboardingPlannerPage() {
  const router = useRouter();
  const { data: allSpecies } = useLiveQuery(listSpecies, []);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 — tank type
  const [tier, setTier] = useState<PlantedTier>("planted");

  // Step 2 — the fish they want (free text + instant catalog suggestions)
  const [wishInput, setWishInput] = useState("");
  const [wishes, setWishes] = useState<string[]>([]);

  // Step 3 — tank size in feet + shape + city
  const [lengthFt, setLengthFt] = useState<number>(2);
  const [shape, setShape] = useState<TankShape>("long");
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

  const dims = useMemo(() => tankDimensions(lengthFt, shape), [lengthFt, shape]);
  const volumeL = dims.volumeL;
  const climate = matchCityClimate(city);
  const customTempNum = useCustomRoomTemp && customRoomTemp ? Number(customRoomTemp) : null;

  // Instant catalog suggestions while typing (Jaideep: "typing a fish
  // name should show 2/3 recos"). Fish, shrimp AND snails — anything
  // alive you can keep — top 3. The catalog is local so this is
  // immediate. Derived during render, not an effect.
  const typeahead = useMemo(() => {
    const q = wishInput.trim().toLowerCase();
    if (q.length < 2 || !allSpecies) return [];
    return allSpecies
      .filter((s) => {
        if (s.category === "plant") return false;
        let names: string[] = [];
        try {
          names = s.commonNames ? JSON.parse(s.commonNames) : [];
        } catch {
          names = [];
        }
        return (
          s.id.includes(q.replace(/\s+/g, "-")) ||
          (s.scientificName ?? "").toLowerCase().includes(q) ||
          names.some((n) => n.toLowerCase().includes(q))
        );
      })
      .slice(0, 3);
  }, [wishInput, allSpecies]);

  function addWish(text?: string) {
    const w = (text ?? wishInput).trim();
    if (!w) return;
    setWishes((prev) => (prev.some((x) => x.toLowerCase() === w.toLowerCase()) ? prev : [...prev, w]));
    setWishInput("");
  }

  function addSpeciesWish(s: SpeciesRow) {
    const name = firstName(s.commonNames) ?? s.id;
    setWishes((prev) => (prev.some((x) => x.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]));
    setWishInput("");
  }

  async function handleBuildPlan() {
    setStep(4);
    setAiLoading(true);
    setAiError(null);
    setAiPlan(null);

    // The deterministic plan is instant — numbers on screen immediately.
    const basePlan = buildSetupPlan({
      volumeL,
      lengthCm: dims.lengthCm,
      widthCm: dims.widthCm,
      tier,
      hasCo2: false,
      speciesRows: [],
      climate,
      customRoomTempC: customTempNum,
    });
    setPlan(basePlan);
    setTankName(`${lengthFt}ft ${shape} ${tier === "planted" ? "planted" : tier === "hardscape" ? "hardscape" : "bare-bottom"} tank`);

    try {
      const result = await getPlannerAdvice({
        tankType: tier,
        band: `${lengthFt}ft ${shape} (~${volumeL}L)`,
        city: city.trim(),
        wishList: wishes,
      });
      if (!result.ok) {
        setAiError(result.error);
      } else {
        const p = result.data.plan as unknown as AiPlan;
        setAiPlan(p);
        // Seed the wishlist with the fish the user actually wished for
        // (matched to catalog rows) — NOT with everything the advisor
        // recommends. Suggestions stay as "+ Add" offers so the user
        // chooses what goes in (Jaideep, 2026-09-06: "let me add recos
        // but don't remove the suggested fish field").
        const wishIds = new Set<string>();
        for (const w of wishes) {
          const q = w.trim().toLowerCase().replace(/\s+/g, "-");
          for (const s of allSpecies ?? []) {
            // The live-queried rows store commonNames as a JSON string;
            // handle both that and a plain array defensively.
            let names: string[] = [];
            try {
              names = typeof s.commonNames === "string" ? JSON.parse(s.commonNames) : s.commonNames ?? [];
            } catch {
              names = [];
            }
            if (
              s.category !== "plant" &&
              (s.id === q ||
                (s.scientificName ?? "").toLowerCase().includes(q) ||
                names.some((n) => n.toLowerCase().includes(w.trim().toLowerCase())))
            ) {
              wishIds.add(s.id);
              break;
            }
          }
        }
        const ids = [...wishIds]
          .filter((id) => speciesById.has(id))
          .map((id) => ({ speciesId: id, count: 1 }));
        setPicked(ids);
        const rows = ids.map((i) => speciesById.get(i.speciesId)).filter((s): s is SpeciesRow => !!s);
        setPlan(
          buildSetupPlan({
            volumeL,
            lengthCm: dims.lengthCm,
            widthCm: dims.widthCm,
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
        name: tankName.trim() || `${lengthFt}ft tank`,
        lengthCm: dims.lengthCm,
        widthCm: dims.widthCm,
        heightCm: dims.heightCm,
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
      await addEquipment({ tankId, type: "filter", subtype: plan.filter.subtype });
      await addEquipment({ tankId, type: "light", wattage: plan.lighting.wattage });

      if (tier === "planted") {
        const plantIds = new Set((aiPlan?.suggested_plants ?? []).map((p) => p.species_id));
        for (const pid of plantIds) {
          const sp = speciesById.get(pid);
          // The advisor occasionally names a non-plant id here (e.g. a snail) —
          // 2026-09-12 bug report: "it says plants will thrive here and shows an
          // Amazon snail." Only ever save something as a plant if our own
          // catalog actually agrees it's a plant; never trust the AI's category
          // implicitly. A misfiled snail is simply dropped here, not saved as
          // anything wrong.
          if (sp && sp.category === "plant") await addPlant({ tankId, speciesId: pid, commonName: firstName(sp.commonNames) ?? pid });
        }
      }

      for (const p of picked) {
        await addLivestock({ tankId, speciesId: p.speciesId, count: p.count, status: "planned" });
        await unlockDexCard({ speciesId: p.speciesId, unlockSource: "added_to_tank" }).catch(() => {});
      }

      const planLines = [
        `Setup plan (${tier}, ${lengthFt}ft ${shape}, ~${volumeL}L)`,
        plan.heaterWatts != null ? `Heater: ${plan.heaterWatts}W` : "Heater: not needed",
        `Filter: ${plan.filter.shopLabel}`,
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
            <PrimaryButton onClick={() => setStep(3)}>Next — Tank size</PrimaryButton>
            <SecondaryButton onClick={() => setStep(1)}>Back</SecondaryButton>
          </>
        }
      >
        <BackHeader title="Help me build a tank" fallbackHref="/" />
        <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
          What fish do you imagine in it? Type anything — a species, a vibe, a colour.
        </p>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Field
              label=""
              placeholder="e.g. guppy, tetra, shrimp…"
              value={wishInput}
              onChange={(e) => setWishInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (typeahead.length > 0) addSpeciesWish(typeahead[0]);
                  else addWish();
                }
              }}
            />
            <SecondaryButton style={{ width: "auto", padding: "8px 16px" }} onClick={() => addWish()}>
              Add
            </SecondaryButton>
          </div>

          {/* Instant catalog suggestions while typing — 2/3 recos, tap to add */}
          {typeahead.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {typeahead.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addSpeciesWish(s)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: 8, border: "1px solid var(--color-line)", borderRadius: 8, marginBottom: 4, background: "var(--color-surface)" }}
                >
                  <SpeciesThumb imageUri={s.imageUri} category={s.category} size={28} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>{firstName(s.commonNames) ?? s.id}</span>
                    {s.minVolumeL != null && (
                      <span style={{ display: "block", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>needs {s.minVolumeL}L or more</span>
                    )}
                  </span>
                  <span style={{ color: "var(--color-deep)", fontSize: "var(--font-caption-size)", fontWeight: 600 }}>+ Add</span>
                </button>
              ))}
            </div>
          )}

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

          {wishes.length === 0 && wishInput.trim().length < 2 && (
            <>
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 12, marginBottom: 6 }}>
                Not sure yet? These are proven first fish:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["guppies", "neon tetras", "a betta", "cherry shrimp", "corydoras", "harlequin rasboras"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addWish(s)}
                    style={{ padding: "6px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--color-line)", background: "var(--color-surface)", fontSize: "var(--font-caption-size)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      </Screen>
    );
  }

  // ---- Step 3 — how big (feet + shape) + where ------------------------------
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
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Tank length</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TANK_LENGTHS_FT.map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() => {
                  setLengthFt(ft);
                  if (!cubeAvailable(ft)) setShape("long");
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${lengthFt === ft ? "var(--color-deep)" : "var(--color-line)"}`,
                  background: lengthFt === ft ? "var(--color-deep)" : "transparent",
                  color: lengthFt === ft ? "#fff" : "var(--color-ink)",
                  fontWeight: 700,
                  fontSize: "var(--font-body-sm-size)",
                }}
              >
                {ft} ft
              </button>
            ))}
          </div>

          {cubeAvailable(lengthFt) && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Shape</p>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    ["long", "▭ Long", "Wider than tall — the classic showcase"],
                    ["cube", "⬜ Cube", "Equal sides — a modern, compact look"],
                  ] as [TankShape, string, string][]
                ).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setShape(value)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${shape === value ? "var(--color-deep)" : "var(--color-line)"}`,
                      background: shape === value ? "var(--color-deep-soft, rgba(0,0,0,0.04))" : "transparent",
                      color: "var(--color-ink)",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "block", fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>{label}</span>
                    <span style={{ display: "block", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 2 }}>{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 12 }}>
            {dims.lengthCm} × {dims.widthCm} × {dims.heightCm} cm · ≈ {volumeL} litres
          </p>
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
  const tempRange = plan.cityTempRange ?? { lowC: GENERIC_INDIA_CLIMATE.winterLowC, highC: GENERIC_INDIA_CLIMATE.summerHighC, band: GENERIC_INDIA_CLIMATE.band };
  const tempSource =
    plan.roomTempUsed?.source === "your home"
      ? "your own room temperature"
      : climate
        ? `typical indoor temperatures in ${climate.band.toLowerCase()}`
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
            Everything you planned — equipment and wishlist fish — is already on this device.
          </p>
        </>
      ) : (
        <>
          {aiLoading && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginBottom: 12,
                padding: "28px 20px",
                borderRadius: "var(--radius-lg, 16px)",
                background: "var(--color-deep)",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.15))",
              }}
            >
              <LottiePlayer name="thinking" size={110} />
              <p style={{ margin: 0, fontSize: "var(--font-body-size)", fontWeight: 700, textAlign: "center" }}>
                Our advisor is checking your fish list…
              </p>
              <p style={{ margin: 0, fontSize: "var(--font-caption-size)", opacity: 0.8, textAlign: "center" }}>
                Matching against 1,484 species — usually 5–15 seconds.
              </p>
            </div>
          )}

          {aiError && !aiPlan && (
            <div style={{ marginBottom: 12 }}>
              <Banner severity="watch">{aiError}</Banner>
            </div>
          )}

          {/* Unified "what's needed" report — rewritten 2026-09-12 per Jaideep's direct
              feedback: the old version was five separate boxy cards (Heater/Filter/
              Light/Substrate/wishlist) that read as disconnected labels, not a
              coherent recommendation. This is now one advisor-framed report, with
              each requirement shown as a single crisp row in the same visual
              language as the fish-compatibility summary (CompatibilitySummary) —
              label + one-line verdict, not a paragraph — so it reads as "here's
              what your tank needs," not a pile of unrelated boxes. */}
          <Card style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 2 }}>🐠 Our AI advisor says</p>
            <p style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 8 }}>
              For your tank, here&apos;s what&apos;s needed:
            </p>

            {[
              {
                icon: "📐",
                label: "Tank size",
                text: `${lengthFt}ft ${shape} — ${dims.lengthCm}×${dims.widthCm}×${dims.heightCm}cm, ≈${volumeL}L`,
              },
              {
                icon: "🌡️",
                label: "Heater",
                text: plan.heaterWatts == null ? "Not needed — your room stays warm enough" : `${plan.heaterWatts}W`,
              },
              { icon: "💧", label: "Filter", text: plan.filter.shopLabel },
              { icon: "💡", label: "Light", text: `${plan.lighting.wattage}W, ${plan.lighting.level} light` },
              {
                icon: "🪨",
                label: "Substrate",
                text:
                  plan.substrate.kind == null
                    ? "None — bare-bottom"
                    : `${plan.substrate.kind}, ${plan.substrate.depthCm}cm (~${plan.substrate.approxKg}kg)`,
              },
              {
                icon: "🐟",
                label: "Fish list",
                text: picked.length
                  ? picked.map((p) => firstName(speciesById.get(p.speciesId)?.commonNames ?? null) ?? p.speciesId).join(", ")
                  : "None yet — add fish above to see what your tank needs",
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: "1px solid var(--color-line-soft)" }}
              >
                <span style={{ flexShrink: 0, width: 92, fontSize: "var(--font-caption-size)", fontWeight: 700 }}>
                  {row.icon} {row.label}
                </span>
                <span style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-ink)" }}>{row.text}</span>
              </div>
            ))}

            {picked.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 4 }}>
                {picked.map((p) => {
                  const s = speciesById.get(p.speciesId);
                  return (
                    <div key={p.speciesId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <SpeciesThumb imageUri={s?.imageUri} category={s?.category} size={26} />
                      <span style={{ flex: 1, fontSize: "var(--font-body-sm-size)" }}>
                        {firstName(s?.commonNames ?? null) ?? p.speciesId}
                      </span>
                      <Chip variant="neutral">planned</Chip>
                    </div>
                  );
                })}
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
                  Just choose the fish for now — you&apos;ll pick how many of each after the tank is saved, on its Fish page.
                </p>
              </div>
            )}

            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--color-line-soft)" }}>
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
                {plan.heaterWatts != null &&
                  (city.trim()
                    ? `Heater sized for ${city.trim()} — rooms there typically sit around ${tempRange.lowC}°C on winter nights and ${tempRange.highC}°C in summer${plan.roomTempUsed?.source === "city typical" ? "; sized for the winter nights" : ""}. `
                    : `Heater sized for a room around ${plan.roomTempUsed?.value}°C (${tempSource}). `)}
                {plan.filter.why} {tier === "planted" ? "Light level is enough for easy plants." : ""}
              </p>
              {plan.heaterNote && (
                <div style={{ marginTop: 6 }}>
                  <Banner severity="watch">{plan.heaterNote}</Banner>
                </div>
              )}
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: "var(--font-caption-size)", color: "var(--color-deep)", fontWeight: 600 }}>
                  Adjust heater sizing for your room
                </summary>
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--font-body-sm-size)" }}>
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
                            lengthCm: dims.lengthCm,
                            widthCm: dims.widthCm,
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
                        placeholder={`e.g. ${tempRange.lowC}`}
                      />
                      <SecondaryButton
                        style={{ width: "auto", padding: "6px 14px", marginTop: 4 }}
                        onClick={() => {
                          const t = customRoomTemp ? Number(customRoomTemp) : null;
                          const rows = picked.map((i) => speciesById.get(i.speciesId)).filter((s): s is SpeciesRow => !!s);
                          setPlan(
                            buildSetupPlan({
                              volumeL,
                              lengthCm: dims.lengthCm,
                              widthCm: dims.widthCm,
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
                </div>
              </details>
            </div>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Tank name</p>
            <Field label="" value={tankName} onChange={(e) => setTankName(e.target.value)} placeholder={`${lengthFt}ft tank`} />
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 6 }}>
              {tier === "planted" ? "Planted" : tier === "hardscape" ? "Hardscape" : "Bare-bottom"} · {lengthFt}ft {shape} ({dims.lengthCm} × {dims.widthCm} × {dims.heightCm} cm, ≈{volumeL}L)
            </p>
          </Card>

          {aiPlan && (
            <Card style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>💡 Care tips &amp; recommendations</p>
              <p style={{ fontSize: "var(--font-body-sm-size)", marginBottom: 8, ...twoLineClamp }}>{aiPlan.summary}</p>
              {aiPlan.stocking_notes.map((n, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <Banner severity={n.severity === "warning" ? "fixNow" : n.severity === "watch" ? "watch" : "neutral"}>{n.note}</Banner>
                </div>
              ))}
              {(aiPlan.suggested_fish.length > 0 || aiPlan.recommended_species_ids.some((id) => !picked.some((p) => p.speciesId === id) && speciesById.get(id)?.category !== "plant")) && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 4 }}>Suggested for your tank:</p>
                  {/* Every species the advisor confirmed or suggested, as an addable row — including ones it merely
                      confirmed (recommended_species_ids), so a confirmed companion is still one tap away. Rows already
                      on the wishlist show "Added" instead. */}
                  {[...aiPlan.suggested_fish.map((f) => ({ species_id: f.species_id, why: f.why })), ...aiPlan.recommended_species_ids.filter((id) => !aiPlan.suggested_fish.some((f) => f.species_id === id)).map((id) => ({ species_id: id, why: "Confirmed by the advisor for this tank" }))]
                    .filter((row) => speciesById.has(row.species_id) && speciesById.get(row.species_id)?.category !== "plant")
                    .map((row) => {
                    const sp = speciesById.get(row.species_id);
                    const already = picked.some((p) => p.speciesId === row.species_id);
                    return (
                      <div key={row.species_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <SpeciesThumb imageUri={sp?.imageUri} category={sp?.category} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>
                            {firstName(sp?.commonNames ?? null) ?? row.species_id}
                          </p>
                          <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", ...twoLineClamp }}>{row.why}</p>
                        </div>
                        <SecondaryButton
                          style={{ width: "auto", padding: "5px 12px", flexShrink: 0, fontSize: "var(--font-caption-size)" }}
                          disabled={already}
                          onClick={() => {
                            setPicked((prev) =>
                              prev.some((p) => p.speciesId === row.species_id)
                                ? prev
                                : [...prev, { speciesId: row.species_id, count: 1 }]
                            );
                            // Recompute the plan for the new bioload.
                            const ids = [...picked, { speciesId: row.species_id, count: 1 }];
                            const rows = ids.map((i) => speciesById.get(i.speciesId)).filter((s): s is SpeciesRow => !!s);
                            setPlan(
                              buildSetupPlan({
                                volumeL,
                                lengthCm: dims.lengthCm,
                                widthCm: dims.widthCm,
                                tier,
                                hasCo2: false,
                                speciesRows: rows,
                                climate,
                                customRoomTempC: customTempNum,
                              })
                            );
                          }}
                        >
                          {already ? "Added" : "+ Add"}
                        </SecondaryButton>
                      </div>
                    );
                  })}
                </div>
              )}
              {aiPlan.suggested_plants.some((p) => speciesById.get(p.species_id)?.category === "plant") && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 4 }}>Plants that will thrive here:</p>
                  {/* Only ever show something here if our own catalog agrees it's
                      actually a plant — the advisor has named a non-plant (a
                      snail, with a description) under this heading before, which
                      makes no sense to a reader and was never actually saved as a
                      plant either (see handleSave's matching guard above). */}
                  {aiPlan.suggested_plants.filter((p) => speciesById.get(p.species_id)?.category === "plant").map((p) => {
                    const sp = speciesById.get(p.species_id);
                    return (
                      <div key={p.species_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <SpeciesThumb imageUri={sp?.imageUri} category={sp?.category} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>{firstName(sp?.commonNames ?? null) ?? p.species_id}</p>
                          <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", ...twoLineClamp }}>{p.why}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 16 }}>
            Saving creates the tank as <strong>Planned</strong>. You can adjust everything later.
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
