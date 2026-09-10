export type CompatSpecies = {
  minVolumeL?: number | null;
  tempCMin?: number | null;
  tempCMax?: number | null;
  phMin?: number | null;
  phMax?: number | null;
  minFootprintLengthCm?: number | null;
  minFootprintWidthCm?: number | null;
  socialMinGroup?: number | null;
  temperament?: string | null;
  swimLevel?: string | null;
};

type Verdict = "ok" | "watch" | "fixNow";

/**
 * A crisp, always-the-same-shape compatibility readout — Size, Temp,
 * Parameters, and Setup are computed straight from species/tank data
 * already on hand, no AI round trip, no risk of vague prose, no wait.
 *
 * Deliberately the *only* compatibility check in the add-fish flow —
 * 2026-09-10: an AI batch check used to run on "Done", but Jaideep found
 * it confusing/unreliable in practice ("it ran the compatibility check and
 * just completely f***** it up") and asked for it gone entirely. This
 * derived-only summary is what's left, shown the moment a species is
 * selected, immediately followed by "Add to tank" — see
 * src/app/tank/[id]/livestock/{page,search/page,scan/page}.tsx.
 */
export function CompatibilitySummary({
  tank,
  species,
  existingSpecies,
}: {
  tank: { volumeL: number; lengthCm: number; widthCm: number };
  species: CompatSpecies;
  existingSpecies: CompatSpecies[];
}) {
  const rows: { label: string; verdict: Verdict; text: string }[] = [];

  // Size
  if (species.minVolumeL != null) {
    const ok = tank.volumeL >= species.minVolumeL;
    rows.push({
      label: "Size",
      verdict: ok ? "ok" : "fixNow",
      text: ok ? `Needs ${species.minVolumeL}+ L — your ${tank.volumeL} L tank fits` : `Needs ${species.minVolumeL}+ L — your tank is only ${tank.volumeL} L`,
    });
  }

  // Temp — overlap against whatever's already alive in the tank, not just this one species in isolation.
  if (species.tempCMin != null && species.tempCMax != null) {
    const existingRanges = existingSpecies.filter((s) => s.tempCMin != null && s.tempCMax != null);
    if (existingRanges.length > 0) {
      const overlapMin = Math.max(species.tempCMin, ...existingRanges.map((s) => s.tempCMin as number));
      const overlapMax = Math.min(species.tempCMax, ...existingRanges.map((s) => s.tempCMax as number));
      const ok = overlapMin <= overlapMax;
      rows.push({
        label: "Temp",
        verdict: ok ? "ok" : "fixNow",
        text: ok ? `${species.tempCMin}–${species.tempCMax}°C — overlaps your tank's current ${overlapMin}–${overlapMax}°C range` : `${species.tempCMin}–${species.tempCMax}°C — doesn't overlap what you already keep (needs ${overlapMin}–${overlapMax}°C)`,
      });
    } else {
      rows.push({ label: "Temp", verdict: "ok", text: `${species.tempCMin}–${species.tempCMax}°C` });
    }
  }

  // Parameters (pH)
  if (species.phMin != null && species.phMax != null) {
    const existingRanges = existingSpecies.filter((s) => s.phMin != null && s.phMax != null);
    if (existingRanges.length > 0) {
      const overlapMin = Math.max(species.phMin, ...existingRanges.map((s) => s.phMin as number));
      const overlapMax = Math.min(species.phMax, ...existingRanges.map((s) => s.phMax as number));
      const ok = overlapMin <= overlapMax;
      rows.push({
        label: "Parameters",
        verdict: ok ? "ok" : "watch",
        text: ok ? `pH ${species.phMin}–${species.phMax} — overlaps your tank's current ${overlapMin.toFixed(1)}–${overlapMax.toFixed(1)} range` : `pH ${species.phMin}–${species.phMax} — narrow overlap with what you already keep`,
      });
    } else {
      rows.push({ label: "Parameters", verdict: "ok", text: `pH ${species.phMin}–${species.phMax}` });
    }
  }

  // Setup — footprint, schooling, temperament: the "does my tank suit this fish's habits" facts.
  const setupBits: string[] = [];
  if (species.minFootprintLengthCm != null && species.minFootprintWidthCm != null) {
    const ok = tank.lengthCm >= species.minFootprintLengthCm && tank.widthCm >= species.minFootprintWidthCm;
    setupBits.push(`${ok ? "✓" : "⚠"} Needs ${species.minFootprintLengthCm}×${species.minFootprintWidthCm}cm floor space`);
  }
  if (species.socialMinGroup != null && species.socialMinGroup > 1) {
    setupBits.push(`Best kept in groups of ${species.socialMinGroup}+`);
  }
  if (species.temperament) setupBits.push(`Temperament: ${species.temperament}`);
  if (species.swimLevel) setupBits.push(`Swims: ${species.swimLevel}`);
  if (setupBits.length > 0) {
    const hasWarning = setupBits.some((b) => b.startsWith("⚠"));
    rows.push({ label: "Setup", verdict: hasWarning ? "watch" : "ok", text: setupBits.join(" · ") });
  }

  if (rows.length === 0) return null;

  return (
    <div style={{ margin: "12px 0" }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>Compatibility</p>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--color-line-soft)" }}>
          <span
            style={{
              flexShrink: 0,
              width: 92,
              fontSize: "var(--font-caption-size)",
              fontWeight: 700,
              color:
                r.verdict === "fixNow" ? "var(--color-fix-now)" : r.verdict === "watch" ? "var(--color-watch)" : "var(--color-improve)",
            }}
          >
            {r.label}
          </span>
          <span style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink)" }}>{r.text}</span>
        </div>
      ))}
    </div>
  );
}
