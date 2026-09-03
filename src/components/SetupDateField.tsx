"use client";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatLabel(iso: string): string {
  const today = isoToday();
  const d = new Date(iso + "T00:00:00");
  const formatted = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return iso === today ? `Today (${formatted})` : formatted;
}

/** "Setup date" row with a one-tap "Today" reset and ±1-day steppers — matches the reference flow Jaideep shared. */
export function SetupDateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  return (
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
      <span style={{ fontSize: "var(--font-body-size)" }}>Setup date</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => onChange(isoToday())}
          style={{ background: "none", border: "none", color: "var(--color-deep)", fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}
        >
          {formatLabel(value)}
        </button>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <button
            type="button"
            aria-label="One day later"
            onClick={() => onChange(addDays(value, 1))}
            style={{ background: "none", border: "none", lineHeight: 1, fontSize: 12, cursor: "pointer" }}
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="One day earlier"
            onClick={() => onChange(addDays(value, -1))}
            style={{ background: "none", border: "none", lineHeight: 1, fontSize: 12, cursor: "pointer" }}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}

export { isoToday };
