"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { useLiveQuery } from "@/db/live";
import { getTank, updateTank } from "@/db/queries/tanks";
import { convertDimension } from "@/lib/dimension-units";
import { formatVolumeDual } from "@/lib/units";
import { useTranslation } from "@/i18n/use-translation";

export default function TankSizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslation();
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);

  const [unit, setUnit] = useState<"cm" | "ft">("cm");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adjust state during render (React's recommended pattern) rather than an
  // effect, so the fields prefill the moment `tank` first resolves without
  // an extra render-then-setState round trip.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (tank && loadedId !== tank.id) {
    setLoadedId(tank.id);
    setLength(String(tank.lengthCm));
    setWidth(String(tank.widthCm));
    setHeight(String(tank.heightCm));
  }

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

  async function handleSave() {
    if (!lengthCm || !widthCm || !heightCm) {
      setError(t.tankSizePage.allThreeRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateTank(id, { lengthCm, widthCm, heightCm });
      router.back();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  if (!tank) return <Screen>{t.common.loading}</Screen>;

  return (
    <Screen>
      <BackHeader title={t.tankSizePage.title} fallbackHref={`/tank/${tank.id}/edit`} />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
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
        <Field label={t.scanPage.length} type="number" value={length} onChange={(e) => setLength(e.target.value)} />
        <Field label={t.scanPage.width} type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
        <Field label={t.scanPage.height} type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
      </div>
      {volumeL !== null && (
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 8 }}>≈ {formatVolumeDual(volumeL)}</p>
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
          <Banner severity="fixNow">{error}</Banner>
        </div>
      )}

      <div style={{ height: 16 }} />
      <PrimaryButton onClick={handleSave} disabled={saving}>
        {saving ? t.settingsPage.saving : t.common.save}
      </PrimaryButton>
    </Screen>
  );
}
