"use client";

type Reading = { value: number; measuredAt: string };
type Marker = { occurredAt: string; label: string };

const WIDTH = 320;
const HEIGHT = 140;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 20;

/**
 * Hand-rolled inline SVG line chart — no charting library, per
 * specs/T-017: target band shaded, most recent point labelled, out-of-range
 * points in severity colour, faint horizontal grid, maintenance events as
 * vertical markers. Colours come from CSS custom properties so this reads
 * correctly in dark mode without any extra work.
 */
export function ParamGraph({
  readings,
  targetMin,
  targetMax,
  unit,
  decimals,
  markers,
}: {
  readings: Reading[];
  targetMin: number | null;
  targetMax: number | null;
  unit: string;
  decimals: number;
  markers: Marker[];
}) {
  if (readings.length === 0) return null;

  const sorted = [...readings].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const times = sorted.map((r) => new Date(r.measuredAt).getTime());
  const values = sorted.map((r) => r.value);

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = maxTime - minTime || 1;

  const rangeMin = targetMin ?? Math.min(...values);
  const rangeMax = targetMax ?? Math.max(...values);
  const dataMin = Math.min(...values, rangeMin);
  const dataMax = Math.max(...values, rangeMax);
  const pad = (dataMax - dataMin) * 0.15 || 1;
  const yMin = dataMin - pad;
  const yMax = dataMax + pad;
  const ySpan = yMax - yMin || 1;

  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  function x(t: number) {
    return PAD_X + ((t - minTime) / timeSpan) * plotW;
  }
  function y(v: number) {
    return PAD_TOP + plotH - ((v - yMin) / ySpan) * plotH;
  }

  const points = sorted.map((r) => ({ x: x(new Date(r.measuredAt).getTime()), y: y(r.value), r }));
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];

  const bandTop = targetMax != null ? y(targetMax) : null;
  const bandBottom = targetMin != null ? y(targetMin) : null;

  const relevantMarkers = markers.filter((m) => {
    const t = new Date(m.occurredAt).getTime();
    return t >= minTime && t <= maxTime;
  });

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", maxWidth: 360, height: "auto", display: "block", margin: "0 auto" }}
      role="img"
      aria-label={`Graph of ${readings.length} readings`}
    >
      {/* faint horizontal grid */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD_X} x2={WIDTH - PAD_X} y1={PAD_TOP + plotH * f} y2={PAD_TOP + plotH * f} stroke="var(--color-line)" strokeWidth={0.5} />
      ))}

      {/* target band */}
      {bandTop != null && bandBottom != null && (
        <rect x={PAD_X} y={bandTop} width={plotW} height={Math.max(0, bandBottom - bandTop)} fill="var(--color-improve)" opacity={0.12} />
      )}

      {/* maintenance markers */}
      {relevantMarkers.map((m, i) => {
        const mx = x(new Date(m.occurredAt).getTime());
        return (
          <g key={i}>
            <line x1={mx} x2={mx} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke="var(--color-watch)" strokeWidth={1} strokeDasharray="2,2" />
          </g>
        );
      })}

      {/* line */}
      <polyline points={linePoints} fill="none" stroke="var(--color-deep)" strokeWidth={1.5} />

      {/* points */}
      {points.map((p, i) => {
        const outOfRange = (targetMin != null && p.r.value < targetMin) || (targetMax != null && p.r.value > targetMax);
        const isLast = i === points.length - 1;
        return (
          <circle key={i} cx={p.x} cy={p.y} r={isLast ? 3.5 : 2} fill={outOfRange ? "var(--color-fix-now)" : "var(--color-deep)"} />
        );
      })}

      {/* last point label */}
      {last && (
        <text x={last.x} y={last.y - 8} textAnchor="middle" fontSize={11} fill="var(--color-ink)">
          {last.r.value.toFixed(decimals)}
          {unit}
        </text>
      )}
    </svg>
  );
}
