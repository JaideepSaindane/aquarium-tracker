"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";

type Range = "day" | "3d" | "week" | "month";
type Series = { key: string; label: string; isCurrency: boolean; values: number[]; total: number };
type Payload = { range: Range; stepMs: number; bucketStarts: string[]; series: Series[] };

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "3d", label: "3 Days" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const TZ = "Asia/Kolkata";

function bucketLabel(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === "day") return d.toLocaleTimeString("en-IN", { hour: "numeric", timeZone: TZ });
  if (range === "3d") return d.toLocaleString("en-IN", { weekday: "short", hour: "numeric", timeZone: TZ });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ });
}

function formatValue(v: number, isCurrency: boolean): string {
  return isCurrency ? `$${v.toFixed(v < 1 ? 4 : 2)}` : v.toLocaleString("en-IN");
}

/**
 * Admin graph view (Jaideep, 2026-09-15): every metric as its own small bar
 * chart, with a Day / 3 Days / Week / Month range switch in one row above.
 * One metric per chart (no dual axes), one hue, hover a bar for its exact value.
 */
export function MetricsGraphs() {
  const [range, setRange] = useState<Range>("week");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/timeseries?range=${range}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as Payload;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch(() => !cancelled && setError("Couldn't load graphs."));
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)" }}>Trends</h2>
        <div role="tablist" aria-label="Time range" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 999, background: "var(--color-surface-alt)" }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={range === opt.value}
              onClick={() => setRange(opt.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                fontSize: "var(--font-caption-size)",
                fontWeight: 600,
                background: range === opt.value ? "var(--color-deep)" : "transparent",
                color: range === opt.value ? "#fff" : "var(--color-ink)",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: "var(--color-fix-now)" }}>{error}</p>}
      {!data && !error && <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {data.series.map((s) => (
            <MetricChart key={s.key} series={s} bucketStarts={data.bucketStarts} range={data.range} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricChart({ series, bucketStarts, range }: { series: Series; bucketStarts: string[]; range: Range }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...series.values, 0);
  const CHART_H = 96;
  const shown = hover != null ? series.values[hover] : null;

  return (
    <Card>
      <p style={{ margin: 0, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>{series.label}</p>
      <p style={{ margin: "2px 0 10px", fontSize: "var(--font-heading-size)", fontWeight: 700 }}>
        {formatValue(hover != null ? (shown ?? 0) : series.total, series.isCurrency)}
        <span style={{ marginLeft: 6, fontSize: "var(--font-caption-size)", fontWeight: 400, color: "var(--color-ink-muted)" }}>
          {hover != null ? bucketLabel(bucketStarts[hover], range) : "total"}
        </span>
      </p>

      <div
        style={{ display: "flex", alignItems: "flex-end", gap: 2, height: CHART_H, borderBottom: "1px solid var(--color-line)" }}
        onMouseLeave={() => setHover(null)}
      >
        {series.values.map((v, i) => {
          const h = max > 0 ? Math.max(v > 0 ? 3 : 0, (v / max) * CHART_H) : 0;
          return (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
              title={`${bucketLabel(bucketStarts[i], range)}: ${formatValue(v, series.isCurrency)}`}
              style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "default" }}
            >
              <div
                style={{
                  width: "100%",
                  height: h,
                  borderRadius: "4px 4px 0 0",
                  background: "var(--color-deep)",
                  opacity: hover == null || hover === i ? 1 : 0.45,
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--color-ink-muted)" }}>
        <span>{bucketLabel(bucketStarts[0], range)}</span>
        <span>{bucketLabel(bucketStarts[bucketStarts.length - 1], range)}</span>
      </div>
    </Card>
  );
}
