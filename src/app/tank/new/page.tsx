"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { AquaIcon } from "@/components/icons/AquaIcon";
import { BackHeader } from "@/components/BackHeader";
import { PrimaryButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { TankAvatar } from "@/components/TankAvatar";
import { ChoiceCard } from "@/components/ChoiceCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { AgeBandField, startedOnFromAgeBand, type AgeBand } from "@/components/AgeBandField";
import { createTank, updateTank } from "@/db/queries/tanks";
import { uploadPhoto } from "@/lib/photo-upload";
import { addPhoto } from "@/db/queries/photos";
import { COMMON_CITIES } from "@/lib/common-options";
import { convertDimension } from "@/lib/dimension-units";
import { formatVolumeDual } from "@/lib/units";
import { useTranslation } from "@/i18n/use-translation";
import { APP_NAME } from "@/constants/app";

export default function NewTankPage() {
  const router = useRouter();
  const t = useTranslation();

  const [photo, setPhoto] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [waterType, setWaterType] = useState<"fresh" | "brackish">("fresh");
  const [ageBand, setAgeBand] = useState<AgeBand>("just_set_up");
  const [unit, setUnit] = useState<"cm" | "ft">("cm");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [city, setCity] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleUnit(next: "cm" | "ft") {
    if (next === unit) return;
    setLength((v) => convertDimension(v, unit, next));
    setWidth((v) => convertDimension(v, unit, next));
    setHeight((v) => convertDimension(v, unit, next));
    setUnit(next);
  }

  const lengthCm = length ? Number(convertDimension(length, unit, "cm")) : null;
  const widthCm = width ? Number(convertDimension(width, unit, "cm")) : null;
  const heightCm = height ? Number(convertDimension(height, unit, "cm")) : null;
  const volumeL =
    lengthCm && widthCm && heightCm ? Math.round(((lengthCm * widthCm * heightCm) / 1000) * 10) / 10 : null;

  async function handleConfirm() {
    if (!name.trim() || !lengthCm || !widthCm || !heightCm) {
      setError(t.newTankPage.nameAndDimensionsRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await createTank({
        name: name.trim(),
        lengthCm,
        widthCm,
        heightCm,
        city: city.trim() || undefined,
        waterType,
        startedOn: startedOnFromAgeBand(ageBand),
      });

      if (photo) {
        // Uploads to Vercel Blob (2026-09-11), not OPFS — tanks are
        // server-backed, so the photo itself needs to be too, or it
        // wouldn't follow the tank to another device.
        const url = await uploadPhoto(photo);
        await updateTank(id, { photoUri: url });
        // Also the tank's first Gallery entry, not just its avatar — a
        // photo taken during setup shouldn't disappear the moment a nicer
        // one replaces the avatar later (Jaideep, 2026-09-02).
        // The photo is being taken right now, regardless of how old the
        // tank itself is — not the (possibly much earlier) age-band date.
        await addPhoto({ tankId: id, localUri: url, caption: "Setup photo", takenAt: new Date().toISOString() });
      }

      setSaved(true);
      // router.replace, not push — so the phone/browser back button from the
      // new tank page returns to the Tanks list, not back to this now-empty
      // form (Jaideep hit exactly this confusion testing live: "had to hit
      // back to find out it saved").
      // Routes through the optional, skippable Tank Check instead of
      // straight to the tank page — manually-created tanks previously got
      // zero AI analysis, ever, unlike the camera-scan onboarding path
      // (Jaideep's ask, 2026-09-04: offer it here too, but never force it).
      router.replace(`/tank/${id}/check?fromCreate=1`);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        // A header-only Save was easy to miss after scrolling down a
        // longer form (Jaideep's ask) — a second, always-visible Save at
        // the bottom fixes that without removing the header one, which
        // some people already reach for out of habit.
        <PrimaryButton onClick={handleConfirm} disabled={saving}>
          {saving ? t.settingsPage.saving : t.common.save}
        </PrimaryButton>
      }
    >
      <BackHeader
        title={t.newTankPage.title}
        fallbackHref="/"
        right={
          <button type="button" onClick={handleConfirm} disabled={saving} style={{ background: "none", border: "none", color: "var(--color-deep)", fontWeight: 600, flexShrink: 0 }}>
            {saving ? t.settingsPage.saving : t.common.save}
          </button>
        }
      />

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <TankAvatar photoUri={null} previewFile={photo} onPhotoChange={setPhoto} />
      </div>
      {photo && (
        <p style={{ textAlign: "center", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: -8, marginBottom: 16 }}>
          {t.newTankPage.photoSelected}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label={t.settingsPage.name} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.newTankPage.namePlaceholder} />

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>{t.scanPage.dimensions}</label>
            <div style={{ width: 120 }}>
              <SegmentedControl
                value={unit}
                onChange={(u) => toggleUnit(u as "cm" | "ft")}
                options={[
                  { value: "cm", label: "cm" },
                  { value: "ft", label: "ft" },
                ]}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field label="" placeholder={t.scanPage.length} type="number" value={length} onChange={(e) => setLength(e.target.value)} />
            <Field label="" placeholder={t.scanPage.width} type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
            <Field label="" placeholder={t.scanPage.height} type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          {/* Redesign brief §14's own example format — both units together,
              so nobody has to do the conversion in their head. */}
          {volumeL !== null && (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 4 }}>≈ {formatVolumeDual(volumeL)}</p>
          )}
        </div>

        <div>
          <label style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600, display: "block", marginBottom: 8 }}>{t.newTankPage.waterType}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ChoiceCard
              selected={waterType === "fresh"}
              onClick={() => setWaterType("fresh")}
              icon={<AquaIcon name="freshwater" size={20} />}
              title={t.newTankPage.freshWater}
              subtitle={t.newTankPage.freshwaterPlantedFocused.replace("{name}", APP_NAME)}
            />
            <ChoiceCard
              selected={waterType === "brackish"}
              onClick={() => setWaterType("brackish")}
              icon={<AquaIcon name="brackish" size={20} />}
              title={t.newTankPage.brackishWater}
            />
          </div>
        </div>

        {/* Brief Section 5: "city moved into More details" — name,
            dimensions and water type are the only things that block
            reaching a real tank; everything else can come later. */}
        <details>
          <summary style={{ cursor: "pointer", fontSize: "var(--font-body-sm-size)", fontWeight: 600, color: "var(--color-deep)" }}>
            {t.newTankPage.moreDetails}
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <div>
              <Field label={t.scanPage.city} list="city-options" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.scanPage.cityPlaceholder} />
              <datalist id="city-options">
                {COMMON_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <AgeBandField value={ageBand} onChange={setAgeBand} />
          </div>
        </details>

        {error && <p style={{ color: "var(--color-fix-now)", fontSize: "var(--font-body-sm-size)" }}>{error}</p>}
        {saved && <Banner severity="improve">{t.newTankPage.tankSavedOpening}</Banner>}
      </div>
    </Screen>
  );
}
