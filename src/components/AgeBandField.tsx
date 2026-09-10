"use client";

// Replaces the old exact-date "Setup date" picker (Jaideep: "no one will
// remember the setup date for their tank... shouldn't it be a rough
// timeframe instead"). Nobody actually knows the calendar day they set up
// a tank — the old field defaulted to "today" and only let you nudge it
// ±1 day, which was tedious and dishonest (most people just left it on
// "today"). A tappable rough age band is both easier to answer *and* a
// more honest signal, since the app already treats `startedOn` as
// self-reported/unverified everywhere it's used (src/lib/tank-context.ts).
//
// Internally still stores a real ISO date on `tanks.startedOn`, since real
// logic reads it as a day count (New Tank Syndrome risk in Ask AquaAI and
// Emergency Triage) — each band maps to its rough midpoint in days-ago.
// "Not sure" stores nothing (`null`), which is more honest than guessing.

export type AgeBand = "just_set_up" | "few_weeks" | "one_to_six_months" | "six_to_twelve_months" | "over_a_year" | "not_sure";

const BANDS: { value: AgeBand; label: string; midpointDays: number | null }[] = [
  { value: "just_set_up", label: "Just set up (this week)", midpointDays: 0 },
  { value: "few_weeks", label: "A few weeks old", midpointDays: 21 },
  { value: "one_to_six_months", label: "1–6 months", midpointDays: 105 },
  { value: "six_to_twelve_months", label: "6–12 months", midpointDays: 270 },
  { value: "over_a_year", label: "Over a year", midpointDays: 550 },
  { value: "not_sure", label: "Not sure", midpointDays: null },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** The band's chosen value → a real ISO date to store on `tanks.startedOn` (or null for "not sure"). */
export function startedOnFromAgeBand(band: AgeBand): string | null {
  const entry = BANDS.find((b) => b.value === band);
  return entry?.midpointDays == null ? null : isoDaysAgo(entry.midpointDays);
}

/** Best-effort reverse mapping, for the edit screen showing which band an existing tank's stored date (or a pre-existing exact date from before this change) falls closest to. */
export function ageBandFromStartedOn(startedOn: string | null | undefined): AgeBand {
  if (!startedOn) return "not_sure";
  const days = Math.round((Date.now() - new Date(startedOn).getTime()) / 86400000);
  if (days <= 10) return "just_set_up";
  if (days <= 63) return "few_weeks";
  if (days <= 187) return "one_to_six_months";
  if (days <= 410) return "six_to_twelve_months";
  return "over_a_year";
}

export function AgeBandField({ value, onChange }: { value: AgeBand; onChange: (band: AgeBand) => void }) {
  return (
    <div>
      <p style={{ fontSize: "var(--font-body-size)", fontWeight: 600, marginBottom: 8 }}>How old is your tank?</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {BANDS.map((b) => {
          const selected = value === b.value;
          return (
            <button
              key={b.value}
              type="button"
              onClick={() => onChange(b.value)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${selected ? "var(--color-deep)" : "var(--color-line)"}`,
                background: selected ? "var(--color-deep-soft)" : "var(--color-surface-alt)",
                color: selected ? "var(--color-deep)" : "var(--color-ink)",
                fontWeight: selected ? 700 : 500,
                fontSize: "var(--font-body-size)",
              }}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
