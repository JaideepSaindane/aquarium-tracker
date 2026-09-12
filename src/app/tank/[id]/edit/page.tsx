"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Screen } from "@/components/Screen";
import { AquaIcon } from "@/components/icons/AquaIcon";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { TankAvatar } from "@/components/TankAvatar";
import { AgeBandField, startedOnFromAgeBand, ageBandFromStartedOn, type AgeBand } from "@/components/AgeBandField";
import { useLiveQuery } from "@/db/live";
import { getTank, updateTank, deleteTank } from "@/db/queries/tanks";
import { listPlantsForTank, addPlant, removePlant } from "@/db/queries/plants";
import { listEquipmentForTank, addEquipment, removeEquipment } from "@/db/queries/equipment";
import { uploadPhoto } from "@/lib/photo-upload";
import { addPhoto } from "@/db/queries/photos";
import { FILTER_SUBTYPES, COMMON_PLANTS, COMMON_CITIES } from "@/lib/common-options";
import { useTranslation } from "@/i18n/use-translation";

export default function EditTankPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslation();
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);
  const { data: plants } = useLiveQuery(() => listPlantsForTank(id), [id]);
  const { data: equipmentList } = useLiveQuery(() => listEquipmentForTank(id), [id]);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [waterType, setWaterType] = useState<"fresh" | "brackish">("fresh");
  const [ageBand, setAgeBand] = useState<AgeBand>("not_sure");
  const [isPlanted, setIsPlanted] = useState(false);
  const [hasCo2, setHasCo2] = useState(false);
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

  // Adjust state during render rather than an effect — see the Tank Size
  // page's comment for why (avoids the extra render-then-setState pass,
  // and satisfies the set-state-in-effect lint rule).
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (tank && loadedId !== tank.id) {
    setLoadedId(tank.id);
    setName(tank.name);
    setCity(tank.city ?? "");
    setWaterType(tank.waterType === "brackish" ? "brackish" : "fresh");
    setAgeBand(ageBandFromStartedOn(tank.startedOn));
    setIsPlanted(!!tank.isPlanted);
    setHasCo2(!!tank.hasCo2);
  }

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
    setSaving(true);
    setError(null);
    try {
      await updateTank(id, {
        name: name.trim(),
        city: city.trim() || undefined,
        waterType,
        startedOn: startedOnFromAgeBand(ageBand),
        isPlanted,
        hasCo2,
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
    await deleteTank(id);
    router.replace("/");
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

  if (!tank) return <Screen>{t.common.loading}</Screen>;

  return (
    <Screen>
      <BackHeader title={tank.name} fallbackHref={`/tank/${id}`} />

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <TankAvatar photoUri={tank.photoUri} onPhotoChange={handlePhotoChange} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

        <Link href={`/tank/${id}/size`}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              border: "1px solid var(--color-line)",
              borderRadius: 8,
            }}
          >
            <span>{t.tankSizePage.title}</span>
            <span style={{ color: "var(--color-ink-muted)" }}>
              {tank.lengthCm}×{tank.widthCm}×{tank.heightCm}cm · {tank.volumeL}L ›
            </span>
          </div>
        </Link>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={isPlanted} onChange={(e) => setIsPlanted(e.target.checked)} />
          <AquaIcon name="planted" size={16} />
          {t.editTankPage.plantedTank}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={hasCo2} onChange={(e) => setHasCo2(e.target.checked)} />
          {t.editTankPage.co2Injection}
        </label>

        {error && <p style={{ color: "var(--color-fix-now)", fontSize: "var(--font-body-sm-size)" }}>{error}</p>}
        {saved && <Banner severity="improve">{t.editTankPage.saved}</Banner>}

        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? t.settingsPage.saving : t.editTankPage.saveChanges}
        </PrimaryButton>
      </div>

      <div style={{ height: 24 }} />

      <section style={{ marginBottom: 20 }}>
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
        {(plants ?? []).length === 0 && <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{t.editTankPage.noneAddedYet}</p>}
        {(plants ?? []).map((p) => (
          <Card key={p.id} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{p.commonName}</span>
            <DangerButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => removePlant(p.id)}>
              {t.common.remove}
            </DangerButton>
          </Card>
        ))}
      </section>

      <section style={{ marginBottom: 24 }}>
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
        {(equipmentList ?? []).length === 0 && <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{t.editTankPage.noneAddedYet}</p>}
        {(equipmentList ?? []).map((eq) => (
          <Card key={eq.id} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {eq.subtype ? FILTER_SUBTYPES.find((fs) => fs.value === eq.subtype)?.label ?? eq.subtype : eq.type}
              {eq.ratedLph ? ` — ${eq.ratedLph} L/h` : ""}
              {eq.wattage ? ` — ${eq.wattage}W` : ""}
            </span>
            <DangerButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => removeEquipment(eq.id)}>
              {t.common.remove}
            </DangerButton>
          </Card>
        ))}
      </section>

      <div style={{ display: "flex", gap: 8 }}>
        <SecondaryButton onClick={handleHide}>{t.editTankPage.hideTank}</SecondaryButton>
        <DangerButton onClick={handleDelete}>{confirmDelete ? t.editTankPage.tapAgainToConfirm : t.editTankPage.deleteTank}</DangerButton>
      </div>
    </Screen>
  );
}
