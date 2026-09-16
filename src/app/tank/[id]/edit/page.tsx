"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { AquaIcon } from "@/components/icons/AquaIcon";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { ChoiceCard } from "@/components/ChoiceCard";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { TankAvatar } from "@/components/TankAvatar";
import { AgeBandField, startedOnFromAgeBand, ageBandFromStartedOn, type AgeBand } from "@/components/AgeBandField";
import { useLiveQuery } from "@/db/live";
import { MissingRecord } from "@/components/MissingRecord";
import { getTank, updateTank, deleteTank } from "@/db/queries/tanks";
import { listPlantsForTank, addPlant, removePlant } from "@/db/queries/plants";
import { listEquipmentForTank, addEquipment, removeEquipment } from "@/db/queries/equipment";
import { uploadPhoto } from "@/lib/photo-upload";
import { addPhoto } from "@/db/queries/photos";
import { convertDimension } from "@/lib/dimension-units";
import { formatVolumeDual } from "@/lib/units";
import { FILTER_SUBTYPES, COMMON_PLANTS, COMMON_CITIES } from "@/lib/common-options";
import type { PlantedTier } from "@/lib/setup-recommendations";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Redesign 2026-09-14 (Jaideep, direct feedback on this exact screen):
 *  - Tank size used to be a separate `/tank/[id]/size` page reached via a
 *    row link — "if I click on that, all my progress from the other things
 *    that I've updated on the edit tank page is actually lost." It's now
 *    three plain fields right here, saved together with everything else in
 *    one `updateTank` call. That size route is gone; nothing else linked to
 *    it.
 *  - "Save Changes" used to sit in the normal document flow, between the
 *    fields and the Plants/Equipment sections — reachable only by scrolling
 *    past everything below it, and visually buried mid-page rather than
 *    reading as the screen's one primary action. It's now the `Screen`
 *    footer, pinned at the bottom like every other form screen in the app
 *    (onboarding, tank creation, Health Check).
 *  - Plants/Equipment rows used to be a full `Card` per item with a
 *    full-width red "Remove" `DangerButton` — "huge Remove buttons... make
 *    this page a bit compact." Both lists are now one `Card` holding plain
 *    rows, each with a small icon-only trash button — no confirmation
 *    dialog, tapping it removes that row immediately (a plant/equipment
 *    line is a low-stakes, easily-re-added edit, not a destructive action
 *    on the level of deleting the whole tank, which still confirms below).
 */
export default function EditTankPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslation();
  const { data: tank, loading: recordLoading, error: recordError } = useLiveQuery(() => getTank(id), [id]);
  const { data: plants } = useLiveQuery(() => listPlantsForTank(id), [id]);
  const { data: equipmentList } = useLiveQuery(() => listEquipmentForTank(id), [id]);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [waterType, setWaterType] = useState<"fresh" | "brackish">("fresh");
  const [ageBand, setAgeBand] = useState<AgeBand>("not_sure");
  const [setupType, setSetupType] = useState<PlantedTier>("hardscape");
  const [hasCo2, setHasCo2] = useState(false);
  const [dimUnit, setDimUnit] = useState<"cm" | "ft">("cm");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddPlant, setShowAddPlant] = useState(false);
  const [plantSelect, setPlantSelect] = useState("");
  const [plantName, setPlantName] = useState("");
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [equipType, setEquipType] = useState("filter");
  const [equipSubtype, setEquipSubtype] = useState(FILTER_SUBTYPES[0].value);
  const [equipRatedLph, setEquipRatedLph] = useState("");
  const [equipWattage, setEquipWattage] = useState("");

  // Adjust state during render rather than an effect — avoids the extra
  // render-then-setState pass, and satisfies the set-state-in-effect lint
  // rule (same pattern the old standalone Tank Size page used).
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (tank && loadedId !== tank.id) {
    setLoadedId(tank.id);
    setName(tank.name);
    setCity(tank.city ?? "");
    setWaterType(tank.waterType === "brackish" ? "brackish" : "fresh");
    setAgeBand(ageBandFromStartedOn(tank.startedOn));
    // Migrates an existing tank that predates this field: fall back to
    // the old isPlanted boolean rather than defaulting every pre-existing
    // tank to "hardscape" the first time someone opens Edit Tank on it.
    setSetupType((tank.setupType as PlantedTier | null) ?? (tank.isPlanted ? "planted" : "hardscape"));
    setHasCo2(!!tank.hasCo2);
    setLength(String(tank.lengthCm));
    setWidth(String(tank.widthCm));
    setHeight(String(tank.heightCm));
  }

  function toggleDimUnit(next: "cm" | "ft") {
    if (next === dimUnit) return;
    setLength((v) => convertDimension(v, dimUnit, next));
    setWidth((v) => convertDimension(v, dimUnit, next));
    setHeight((v) => convertDimension(v, dimUnit, next));
    setDimUnit(next);
  }

  const lengthCm = length ? Number(convertDimension(length, dimUnit, "cm")) : null;
  const widthCm = width ? Number(convertDimension(width, dimUnit, "cm")) : null;
  const heightCm = height ? Number(convertDimension(height, dimUnit, "cm")) : null;
  const volumeL = lengthCm && widthCm && heightCm ? Math.round(((lengthCm * widthCm * heightCm) / 1000) * 10) / 10 : null;

  async function handlePhotoChange(file: File) {
    setError(null);
    try {
      // Uploads to Vercel Blob (2026-09-11), not OPFS — see
      // src/lib/photo-upload.ts.
      const url = await uploadPhoto(file);
      await updateTank(id, { photoUri: url });
      // Same gap already fixed once for the creation wizard (see the
      // "Tank photo now previews instantly and lands in the Gallery too"
      // entry in specs/PROGRESS.md) — changing the photo here never wrote a
      // `photos` row, so it updated the avatar but never showed up in the
      // Gallery tab.
      await addPhoto({ tankId: id, localUri: url, caption: "Tank photo" });
    } catch {
      setError(t.settingsPage.couldNotUploadPhoto);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError(t.editTankPage.nameRequired);
      return;
    }
    if (!lengthCm || !widthCm || !heightCm) {
      setError(t.tankSizePage.allThreeRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateTank(id, {
        name: name.trim(),
        city: city.trim() || undefined,
        waterType,
        startedOn: startedOnFromAgeBand(ageBand),
        setupType,
        isPlanted: setupType === "planted",
        hasCo2,
        lengthCm,
        widthCm,
        heightCm,
      });
      setSaved(true);
      router.replace(`/tank/${id}`);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  async function handleHide() {
    await updateTank(id, { status: "archived" });
    router.replace("/");
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteTank(id);
      router.replace("/");
    } catch {
      // Used to silently do nothing on failure — the tap just didn't work.
      setError(t.common.couldNotSaveTryAgain);
    }
  }

  async function handleAddPlant() {
    if (!plantName.trim()) return;
    await addPlant({ tankId: id, commonName: plantName.trim() });
    setPlantName("");
    setPlantSelect("");
    setShowAddPlant(false);
  }

  async function handleAddEquipment() {
    await addEquipment({
      tankId: id,
      type: equipType,
      subtype: equipType === "filter" ? equipSubtype : undefined,
      ratedLph: equipRatedLph ? Number(equipRatedLph) : undefined,
      wattage: equipWattage ? Number(equipWattage) : undefined,
    });
    setEquipRatedLph("");
    setEquipWattage("");
    setShowAddEquipment(false);
  }

  if (!tank) return <MissingRecord kind="tank" loading={recordLoading} error={recordError} />;

  return (
    <Screen
      footer={
        <>
          {error && <Banner severity="fixNow">{error}</Banner>}
          {saved && <Banner severity="improve">{t.editTankPage.saved}</Banner>}
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? t.settingsPage.saving : t.editTankPage.saveChanges}
          </PrimaryButton>
        </>
      }
    >
      <BackHeader title={tank.name} fallbackHref={`/tank/${id}`} />

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <TankAvatar photoUri={tank.photoUri} onPhotoChange={handlePhotoChange} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label={t.settingsPage.name} value={name} onChange={(e) => setName(e.target.value)} />

        <div>
          <Field label={t.scanPage.city} list="city-options" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.scanPage.cityPlaceholder} />
          <datalist id="city-options">
            {COMMON_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600, display: "block", marginBottom: 4 }}>{t.newTankPage.waterType}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setWaterType("fresh")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-line)",
                background: waterType === "fresh" ? "var(--color-improve)" : "transparent",
                color: waterType === "fresh" ? "#fff" : "var(--color-ink)",
                fontWeight: 600,
              }}
            >
              <AquaIcon name="freshwater" size={16} />
              {t.newTankPage.freshWater}
            </button>
            <button
              type="button"
              onClick={() => setWaterType("brackish")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-line)",
                background: waterType === "brackish" ? "var(--color-deep)" : "transparent",
                color: waterType === "brackish" ? "#fff" : "var(--color-ink)",
                fontWeight: 600,
              }}
            >
              <AquaIcon name="brackish" size={16} />
              {t.newTankPage.brackishWater}
            </button>
          </div>
        </div>

        <AgeBandField value={ageBand} onChange={setAgeBand} />

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>{t.tankSizePage.title}</label>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => toggleDimUnit("cm")}
                style={{
                  padding: "2px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--color-line)",
                  background: dimUnit === "cm" ? "var(--color-deep)" : "transparent",
                  color: dimUnit === "cm" ? "#fff" : "var(--color-ink)",
                  fontSize: "var(--font-caption-size)",
                }}
              >
                cm
              </button>
              <button
                type="button"
                onClick={() => toggleDimUnit("ft")}
                style={{
                  padding: "2px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--color-line)",
                  background: dimUnit === "ft" ? "var(--color-deep)" : "transparent",
                  color: dimUnit === "ft" ? "#fff" : "var(--color-ink)",
                  fontSize: "var(--font-caption-size)",
                }}
              >
                ft
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field label="" placeholder={t.scanPage.length} type="number" value={length} onChange={(e) => setLength(e.target.value)} />
            <Field label="" placeholder={t.scanPage.width} type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
            <Field label="" placeholder={t.scanPage.height} type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          {volumeL !== null && (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 4 }}>≈ {formatVolumeDual(volumeL)}</p>
          )}
        </div>

        <div>
          <label style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600, display: "block", marginBottom: 8 }}>{t.newTankPage.setupTypeLabel}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              [
                ["planted", "", t.plannerPage.plantedOption, t.plannerPage.plantedHint],
                ["hardscape", "", t.plannerPage.hardscapeOption, t.plannerPage.hardscapeHint],
                ["bare_bottom", "", t.plannerPage.bareBottomOption, t.plannerPage.bareBottomHint],
              ] as [PlantedTier, string, string, string][]
            ).map(([value, icon, label, hint]) => (
              <ChoiceCard key={value} selected={setupType === value} onClick={() => setSetupType(value)} icon={icon} title={label} subtitle={hint} />
            ))}
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={hasCo2} onChange={(e) => setHasCo2(e.target.checked)} />
          {t.editTankPage.co2Injection}
        </label>
      </div>

      <div style={{ height: 20 }} />

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)" }}>{t.editTankPage.plants}</h2>
          <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setShowAddPlant((v) => !v)}>
            + {t.common.add}
          </SecondaryButton>
        </div>
        {showAddPlant && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            <select
              value={plantSelect}
              onChange={(e) => {
                setPlantSelect(e.target.value);
                if (e.target.value !== "other") setPlantName(e.target.value);
              }}
              style={{ padding: 8 }}
            >
              <option value="">{t.editTankPage.choosePlant}</option>
              {COMMON_PLANTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="other">{t.editTankPage.otherTypeBelow}</option>
            </select>
            {plantSelect === "other" && (
              <Field label="" placeholder={t.editTankPage.egLudwigia} value={plantName} onChange={(e) => setPlantName(e.target.value)} />
            )}
            <PrimaryButton onClick={handleAddPlant} disabled={!plantName.trim()}>
              {t.common.save}
            </PrimaryButton>
          </div>
        )}
        {(plants ?? []).length === 0 ? (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{t.editTankPage.noneAddedYet}</p>
        ) : (
          <Card style={{ padding: "4px 14px" }}>
            {(plants ?? []).map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--color-line-soft)",
                }}
              >
                <span style={{ fontSize: "var(--font-body-sm-size)" }}>{p.commonName}</span>
                <button
                  type="button"
                  aria-label={`${t.common.remove} ${p.commonName}`}
                  onClick={() => removePlant(p.id)}
                  style={{ width: 32, height: 32, flexShrink: 0, border: "none", background: "none", color: "var(--color-fix-now)", fontSize: 16, cursor: "pointer" }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)" }}>{t.editTankPage.equipment}</h2>
          <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setShowAddEquipment((v) => !v)}>
            + {t.common.add}
          </SecondaryButton>
        </div>
        {showAddEquipment && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            <select value={equipType} onChange={(e) => setEquipType(e.target.value)} style={{ padding: 8 }}>
              <option value="filter">{t.reportPage.filter}</option>
              <option value="heater">{t.reportPage.heater}</option>
              <option value="light">{t.reportPage.light}</option>
              <option value="co2">{t.reportPage.co2}</option>
              <option value="air_pump">{t.reportPage.airPump}</option>
              <option value="other">{t.reportPage.other}</option>
            </select>
            {equipType === "filter" && (
              <>
                <select value={equipSubtype} onChange={(e) => setEquipSubtype(e.target.value)} style={{ padding: 8 }}>
                  {FILTER_SUBTYPES.map((fs) => (
                    <option key={fs.value} value={fs.value}>
                      {fs.label}
                    </option>
                  ))}
                </select>
                <Field
                  label={t.editTankPage.ratedFlowOptional}
                  type="number"
                  value={equipRatedLph}
                  onChange={(e) => setEquipRatedLph(e.target.value)}
                />
              </>
            )}
            {(equipType === "heater" || equipType === "light") && (
              <Field label={t.reportPage.wattage} type="number" value={equipWattage} onChange={(e) => setEquipWattage(e.target.value)} />
            )}
            <PrimaryButton onClick={handleAddEquipment}>{t.common.save}</PrimaryButton>
          </div>
        )}
        {(equipmentList ?? []).length === 0 ? (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{t.editTankPage.noneAddedYet}</p>
        ) : (
          <Card style={{ padding: "4px 14px" }}>
            {(equipmentList ?? []).map((eq, i) => (
              <div
                key={eq.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--color-line-soft)",
                }}
              >
                <span style={{ fontSize: "var(--font-body-sm-size)" }}>
                  {eq.subtype ? FILTER_SUBTYPES.find((fs) => fs.value === eq.subtype)?.label ?? eq.subtype : eq.type}
                  {eq.ratedLph ? ` — ${eq.ratedLph} L/h` : ""}
                  {eq.wattage ? ` — ${eq.wattage}W` : ""}
                </span>
                <button
                  type="button"
                  aria-label={`${t.common.remove} ${eq.type}`}
                  onClick={() => removeEquipment(eq.id)}
                  style={{ width: 32, height: 32, flexShrink: 0, border: "none", background: "none", color: "var(--color-fix-now)", fontSize: 16, cursor: "pointer" }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <div style={{ display: "flex", gap: 8 }}>
        <SecondaryButton onClick={handleHide}>{t.editTankPage.hideTank}</SecondaryButton>
        <DangerButton onClick={handleDelete}>{confirmDelete ? t.editTankPage.tapAgainToConfirm : t.editTankPage.deleteTank}</DangerButton>
      </div>
    </Screen>
  );
}
