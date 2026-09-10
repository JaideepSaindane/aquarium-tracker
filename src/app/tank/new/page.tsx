"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { AquaIcon } from "@/components/icons/AquaIcon";
import { BackHeader } from "@/components/BackHeader";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { TankAvatar } from "@/components/TankAvatar";
import { SetupDateField, isoToday } from "@/components/SetupDateField";
import { createTank, updateTank } from "@/db/queries/tanks";
import { writePhotoFile } from "@/lib/opfs-files";
import { addPhoto } from "@/db/queries/photos";
import { COMMON_CITIES } from "@/lib/common-options";
import { convertDimension } from "@/lib/dimension-units";
import { localDateInputToIso } from "@/lib/schedule";

export default function NewTankPage() {
  const router = useRouter();

  const [photo, setPhoto] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [waterType, setWaterType] = useState<"fresh" | "brackish">("fresh");
  const [setupDate, setSetupDate] = useState(isoToday());
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
      setError("Name and all three dimensions are required.");
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
        startedOn: localDateInputToIso(setupDate),
      });

      if (photo) {
        const path = `tanks/${id}-avatar.jpg`;
        await writePhotoFile(path, photo);
        await updateTank(id, { photoUri: path });
        // Also the tank's first Gallery entry, not just its avatar — a
        // photo taken during setup shouldn't disappear the moment a nicer
        // one replaces the avatar later (Jaideep, 2026-09-02).
        await addPhoto({ tankId: id, localUri: path, caption: "Setup photo", takenAt: localDateInputToIso(setupDate) });
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
    <Screen>
      <BackHeader
        title="Add New Tank"
        fallbackHref="/"
        right={
          <button type="button" onClick={handleConfirm} disabled={saving} style={{ background: "none", border: "none", color: "var(--color-deep)", fontWeight: 600, flexShrink: 0 }}>
            {saving ? "Saving..." : "Save"}
          </button>
        }
      />

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <TankAvatar photoUri={null} previewFile={photo} onPhotoChange={setPhoto} />
      </div>
      {photo && (
        <p style={{ textAlign: "center", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: -8, marginBottom: 16 }}>
          Photo selected
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Living Room 60L" />

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>Dimensions</label>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => toggleUnit("cm")}
                style={{
                  padding: "2px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--color-line)",
                  background: unit === "cm" ? "var(--color-deep)" : "transparent",
                  color: unit === "cm" ? "#fff" : "var(--color-ink)",
                  fontSize: "var(--font-caption-size)",
                }}
              >
                cm
              </button>
              <button
                type="button"
                onClick={() => toggleUnit("ft")}
                style={{
                  padding: "2px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--color-line)",
                  background: unit === "ft" ? "var(--color-deep)" : "transparent",
                  color: unit === "ft" ? "#fff" : "var(--color-ink)",
                  fontSize: "var(--font-caption-size)",
                }}
              >
                ft
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field label="" placeholder="Length" type="number" value={length} onChange={(e) => setLength(e.target.value)} />
            <Field label="" placeholder="Width" type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
            <Field label="" placeholder="Height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          {volumeL !== null && (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 4 }}>≈ {volumeL} litres</p>
          )}
        </div>

        <div>
          <Field label="City" list="city-options" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bangalore" />
          <datalist id="city-options">
            {COMMON_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600, display: "block", marginBottom: 4 }}>Water type</label>
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
              Fresh water
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
              Brackish water
            </button>
          </div>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 4 }}>
            AquaAI is freshwater and planted focused — no reef/marine tanks.
          </p>
        </div>

        <SetupDateField value={setupDate} onChange={setSetupDate} />

        {error && <p style={{ color: "var(--color-fix-now)", fontSize: "var(--font-body-sm-size)" }}>{error}</p>}
        {saved && <Banner severity="improve">Tank saved — opening it now...</Banner>}
      </div>
    </Screen>
  );
}
