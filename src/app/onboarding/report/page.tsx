"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { SeverityCard } from "@/components/SeverityCard";
import { Confidence } from "@/components/Confidence";
import { GroundingLink } from "@/components/GroundingLink";
import { Banner } from "@/components/Banner";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { useScanSession } from "@/store/use-scan-session";
import { createTank } from "@/db/queries/tanks";
import { addEquipment } from "@/db/queries/equipment";
import { addPlant } from "@/db/queries/plants";
import { createTask } from "@/db/queries/tasks";
import { createScan } from "@/db/queries/scans";
import { addLogEntry } from "@/db/queries/log-entries";
import { addPhoto } from "@/db/queries/photos";
import { presetRrule, presetLabel } from "@/lib/reminder-presets";
import { syncReminder } from "@/lib/push-client";
import { FILTER_SUBTYPES } from "@/lib/common-options";
import type { SeverityLevel } from "@/theme/tokens";

const SEVERITY_ORDER: SeverityLevel[] = ["fixNow", "watch", "improve"];
const SEVERITY_KEY: Record<string, SeverityLevel> = { fix_now: "fixNow", watch: "watch", improve: "improve" };

// Below this, a "finding" reads as more guess than fact — render it as an
// open question instead of asserting it. docs/03-ai-contracts.md rendering rules.
const QUESTION_THRESHOLD = 0.35;

// Belt-and-suspenders alongside the prompt instruction (prompts/tank-scan.v1.md)
// telling the model never to list these — no photo can ever answer them, so
// stating "couldn't determine" is obvious and unhelpful. Filtered here too in
// case the model doesn't fully comply.
const NEVER_PHOTO_ANSWERABLE = /\bph\b|ammonia|nitrite|nitrate|water parameter|temperature/i;

const EQUIPMENT_TYPES = [
  { value: "heater", label: "Heater" },
  { value: "filter", label: "Filter" },
  { value: "light", label: "Light" },
  { value: "co2", label: "CO2" },
  { value: "air_pump", label: "Air pump" },
  { value: "other", label: "Other" },
];

type ManualEquipment = { type: string; subtype?: string; wattage?: number; ratedLph?: number };

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

export default function ScanReportPage() {
  const router = useRouter();
  const session = useScanSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualEquipment, setManualEquipment] = useState<ManualEquipment[]>([]);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [newEquipType, setNewEquipType] = useState("heater");
  const [newEquipSubtype, setNewEquipSubtype] = useState(FILTER_SUBTYPES[0].value);
  const [newEquipRating, setNewEquipRating] = useState("");

  useEffect(() => {
    if (!session.report) router.replace("/onboarding/scan");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.report]);

  const report = session.report;
  if (!report) return <Screen>Loading...</Screen>;

  if (!report.image_quality.usable) {
    return (
      <Screen
        footer={
          <PrimaryButton
            onClick={() => {
              session.reset();
              router.push("/onboarding/scan");
            }}
          >
            Retake photo
          </PrimaryButton>
        }
      >
        <BackHeader title="That photo didn't come through clearly" fallbackHref="/onboarding/scan" />
        <Banner severity="watch">{report.image_quality.advice || "Please take another photo and try again."}</Banner>
      </Screen>
    );
  }

  // The model sometimes returns a single { type: "none" } placeholder
  // instead of an empty array when there's no algae to report — filter
  // those out rather than showing a confusing "none (none) — none" card.
  const algae = report.algae.filter((a) => a.type.toLowerCase() !== "none");
  const findings = report.findings.filter((f) => f.confidence >= QUESTION_THRESHOLD);
  const uncertain = report.findings.filter((f) => f.confidence < QUESTION_THRESHOLD);
  const findingsBySeverity = SEVERITY_ORDER.map((level) => ({
    level,
    items: findings.filter((f) => SEVERITY_KEY[f.severity] === level),
  })).filter((g) => g.items.length > 0);
  const couldNotDetermine = report.could_not_determine.filter((item) => !NEVER_PHOTO_ANSWERABLE.test(item));

  function addManualEquipment() {
    const rating = newEquipRating ? Number(newEquipRating) : undefined;
    const entry: ManualEquipment =
      newEquipType === "filter"
        ? { type: newEquipType, subtype: newEquipSubtype, ratedLph: rating }
        : { type: newEquipType, wattage: rating };
    setManualEquipment((list) => [...list, entry]);
    setNewEquipRating("");
    setShowAddEquipment(false);
  }

  function removeManualEquipment(index: number) {
    setManualEquipment((list) => list.filter((_, i) => i !== index));
  }

  async function handleAcceptAndAddLivestock() {
    if (!report || saving) return;
    setSaving(true);
    setError(null);
    try {
      const realPlants = report.plants.filter((p) => p.label.toLowerCase() !== "none");
      const isPlanted = realPlants.length > 0 || report.plant_mass.score > 0.1;
      const hasCo2 =
        report.equipment_visible.some((e) => e.type.toLowerCase().includes("co2")) ||
        manualEquipment.some((e) => e.type.toLowerCase().includes("co2"));
      const volumeName = session.lengthCm && session.widthCm && session.heightCm
        ? `${Math.round(((session.lengthCm * session.widthCm * session.heightCm) / 1000) * 10) / 10}L tank`
        : "My tank";

      const tankId = await createTank({
        name: volumeName,
        lengthCm: session.lengthCm ?? 0,
        widthCm: session.widthCm ?? 0,
        heightCm: session.heightCm ?? 0,
        city: session.city || undefined,
        isPlanted,
        hasCo2,
        setupType: report.setup.type,
        substrate: report.hardscape.substrate || undefined,
        status: "active",
        photoUri: session.originalPhotoPath ?? undefined,
      });

      // The model sometimes returns a single { type: "none" } / { label: "none" }
      // placeholder instead of an empty array — skip those rather than
      // inserting a bogus equipment/plant row.
      for (const item of report.equipment_visible) {
        if (item.type.toLowerCase() === "none") continue;
        await addEquipment({ tankId, type: item.type, subtype: item.subtype || undefined });
      }
      for (const item of manualEquipment) {
        await addEquipment({ tankId, type: item.type, subtype: item.subtype, wattage: item.wattage, ratedLph: item.ratedLph });
      }
      for (const plant of report.plants) {
        if (plant.label.toLowerCase() === "none") continue;
        await addPlant({ tankId, commonName: plant.label });
      }
      for (const rec of report.recommended_maintenance) {
        const nextDueAt = daysFromNow(rec.interval_days);
        const title = presetLabel(rec.preset_type);
        const rrule = presetRrule(rec.interval_days);
        const taskId = await createTask({ tankId, title, presetType: rec.preset_type, rrule, nextDueAt });
        await syncReminder({ taskId, title, tankId, tankName: volumeName, dueAt: nextDueAt, rrule });
      }

      if (session.originalPhotoPath) {
        await createScan({
          tankId,
          imageUri: session.originalPhotoPath,
          modelName: session.modelName ?? "unknown",
          promptVersion: report.prompt_version,
          rawResponse: report,
          findings: report.findings,
          scores: report.scores,
          userCorrections: Object.keys(session.clarifyingAnswers).length ? session.clarifyingAnswers : undefined,
        });

        // The scan builds the tank's history for free — specs/T-022 wants
        // every scan to leave a journal entry with the report attached.
        const findingSummary = findings.length > 0 ? findings.map((f) => f.title).join("; ") : "No issues flagged.";
        const entryId = await addLogEntry({
          tankId,
          type: "journal",
          body: `Tank Scan: ${report.setup.type} setup. ${findingSummary}`,
        });
        await addPhoto({ tankId, logEntryId: entryId, localUri: session.originalPhotoPath });
      }

      // Don't reset the store before navigating — clearing `report`
      // synchronously here would fire this page's own "no report, bounce
      // to /onboarding/scan" guard effect before the push below lands,
      // racing it back to the wrong screen. The scan page resets the
      // session itself on next mount instead.
      router.push(`/tank/${tankId}/livestock`);
    } catch (err) {
      setError(`Something went wrong saving your tank: ${String(err)}`);
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <PrimaryButton onClick={handleAcceptAndAddLivestock} disabled={saving}>
            {saving ? "Saving..." : "Looks good — add what's living here"}
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              session.reset();
              router.push("/onboarding/scan");
            }}
            disabled={saving}
          >
            Retake photo instead
          </SecondaryButton>
        </>
      }
    >
      <BackHeader title="Tank Report" fallbackHref="/onboarding/scan" />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
        {report.setup.type} setup · {report.tank_estimate.clarity}
      </p>

      {findingsBySeverity.map((group) => (
        <div key={group.level} style={{ marginBottom: 16 }}>
          {group.items.map((f) => (
            <div key={f.id} style={{ marginBottom: 8 }}>
              <SeverityCard severity={group.level} title={f.title}>
                {f.explanation}
              </SeverityCard>
              {f.recommended_action && (
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginTop: 4, marginLeft: 4 }}>
                  → {f.recommended_action}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4, marginLeft: 4 }}>
                <Confidence value={f.confidence} />
                {f.grounding_refs.map((ref) => {
                  const [type, id] = ref.split(":");
                  return (
                    <GroundingLink
                      key={ref}
                      label={ref}
                      onOpen={type === "species" ? () => router.push(`/dex/${id}`) : type === "corpus" ? () => router.push(`/corpus/${id}`) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {uncertain.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Not sure about these — worth a second look</p>
          {uncertain.map((f) => (
            <p key={f.id} style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>
              {f.title}?
            </p>
          ))}
        </Card>
      )}

      {couldNotDetermine.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Couldn&apos;t tell from this photo</p>
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
            {couldNotDetermine.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showAddEquipment || manualEquipment.length ? 8 : 0 }}>
          <p style={{ fontWeight: 600 }}>Equipment we missed?</p>
          {!showAddEquipment && (
            <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setShowAddEquipment(true)}>
              + Add
            </SecondaryButton>
          )}
        </div>
        {manualEquipment.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "var(--font-body-sm-size)" }}>
              {item.subtype
                ? FILTER_SUBTYPES.find((t) => t.value === item.subtype)?.label ?? item.subtype
                : EQUIPMENT_TYPES.find((t) => t.value === item.type)?.label ?? item.type}
              {item.wattage ? ` — ${item.wattage}W` : ""}
              {item.ratedLph ? ` — ${item.ratedLph} L/h` : ""}
            </span>
            <button
              type="button"
              onClick={() => removeManualEquipment(i)}
              style={{ background: "none", border: "none", color: "var(--color-fix-now)", fontSize: "var(--font-caption-size)" }}
            >
              Remove
            </button>
          </div>
        ))}
        {showAddEquipment && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={newEquipType} onChange={(e) => setNewEquipType(e.target.value)} style={{ padding: 8 }}>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {newEquipType === "filter" && (
              <select value={newEquipSubtype} onChange={(e) => setNewEquipSubtype(e.target.value)} style={{ padding: 8 }}>
                {FILTER_SUBTYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}
            <Field
              label={newEquipType === "filter" ? "Rated flow (L/h) — optional" : "Wattage"}
              type="number"
              value={newEquipRating}
              onChange={(e) => setNewEquipRating(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <PrimaryButton onClick={addManualEquipment}>Save</PrimaryButton>
              <SecondaryButton onClick={() => setShowAddEquipment(false)}>Cancel</SecondaryButton>
            </div>
          </div>
        )}
      </Card>

      {algae.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Algae spotted</p>
          {algae.map((a, i) => (
            <p key={i} style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
              {a.type} ({a.severity}) — {a.location}
            </p>
          ))}
        </Card>
      )}

      {error && (
        <div style={{ marginBottom: 12 }}>
          <Banner severity="fixNow">{error}</Banner>
        </div>
      )}
    </Screen>
  );
}
