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
 *
 * Rewritten 2026-09-10 (same day, later feedback): every row was 2-3 lines
 * of explanation ("overlaps your tank's current X-Y range", "doesn't
 * overlap what you already keep") — Jaideep asked for exactly one short
 * line per row and tighter padding, since the whole point is a fast glance
 * before tapping "Add to tank", not a paragraph to read.
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

  // Size — unchanged, Jaideep confirmed this one already reads well.
  if (species.minVolumeL != null) {
    const ok = tank.volumeL >= species.minVolumeL;
    rows.push({
      label: "Size",
      verdict: ok ? "ok" : "fixNow",
      text: ok ? `Needs ${species.minVolumeL}+ L — your ${tank.volumeL} L tank fits` : `Needs ${species.minVolumeL}+ L — your tank is only ${tank.volumeL} L`,
    });
  }

  // Temp — just the ideal range and a one-word verdict against the tank's
  // existing fish, no overlap-math explanation.
  if (species.tempCMin != null && species.tempCMax != null) {
    const existingRanges = existingSpecies.filter((s) => s.tempCMin != null && s.tempCMax != null);
    const ok =
      existingRanges.length === 0 ||
      Math.max(species.tempCMin, ...existingRanges.map((s) => s.tempCMin as number)) <=
        Math.min(species.tempCMax, ...existingRanges.map((s) => s.tempCMax as number));
    rows.push({
      label: "Temp",
      verdict: ok ? "ok" : "fixNow",
      text: `${species.tempCMin}–${species.tempCMax}°C — ${ok ? "works for your tank" : "may not suit your tank"}`,
    });
  }

  // Parameters (pH) — same crisp treatment.
  if (species.phMin != null && species.phMax != null) {
    const existingRanges = existingSpecies.filter((s) => s.phMin != null && s.phMax != null);
    const ok =
      existingRanges.length === 0 ||
      Math.max(species.phMin, ...existingRanges.map((s) => s.phMin as number)) <=
        Math.min(species.phMax, ...existingRanges.map((s) => s.phMax as number));
    rows.push({
      label: "Parameters",
      verdict: ok ? "ok" : "watch",
      text: `pH ${species.phMin}–${species.phMax} — ${ok ? "compatible" : "narrow fit"}`,
    });
  }

  // Setup — footprint, schooling, temperament, all on one line.
  const setupBits: string[] = [];
  let setupWarning = false;
  if (species.minFootprintLengthCm != null && species.minFootprintWidthCm != null) {
    const ok = tank.lengthCm >= species.minFootprintLengthCm && tank.widthCm >= species.minFootprintWidthCm;
    if (!ok) setupWarning = true;
    setupBits.push(`${ok ? "✓" : "⚠"} ${species.minFootprintLengthCm}×${species.minFootprintWidthCm}cm`);
  }
  if (species.socialMinGroup != null && species.socialMinGroup > 1) setupBits.push(`Group of ${species.socialMinGroup}+`);
  if (species.temperament) setupBits.push(species.temperament);
  if (species.swimLevel) setupBits.push(species.swimLevel);
  if (setupBits.length > 0) {
    rows.push({ label: "Setup", verdict: setupWarning ? "watch" : "ok", text: setupBits.join(" · ") });
  }

  if (rows.length === 0) return null;

  return (
    <div style={{ margin: "8px 0" }}>
      <p style={{ fontWeight: 600, marginBottom: 2, fontSize: "var(--font-caption-size)" }}>Compatibility</p>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{ display: "flex", gap: 8, padding: "3px 0", borderTop: "1px solid var(--color-line-soft)" }}
        >
          <span
            style={{
              flexShrink: 0,
              width: 78,
              fontSize: "var(--font-caption-size)",
              fontWeight: 700,
              color:
                r.verdict === "fixNow" ? "var(--color-fix-now)" : r.verdict === "watch" ? "var(--color-watch)" : "var(--color-improve)",
            }}
          >
            {r.label}
          </span>
          <span
            style={{
              fontSize: "var(--font-caption-size)",
              color: "var(--color-ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {r.text}
          </span>
        </div>
      ))}
    </div>
  );
}
