"use client";

import { use, useEffect, useRef, useState } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { ParamGraph } from "@/components/ParamGraph";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";
import {
  getEffectiveParameterDefs,
  setTankParameterTarget,
  addCustomParameter,
} from "@/db/queries/parameter-defs";
import { listMeasurementsForTank, addMeasurement, getLastMeasurement } from "@/db/queries/measurements";
import { addLogEntry, listLogEntriesForTank } from "@/db/queries/log-entries";
import { checkParameterOutOfRange } from "@/lib/derived-checks";

const METHODS = [
  { value: "liquid_kit", label: "Liquid kit" },
  { value: "strip", label: "Test strip" },
  { value: "probe", label: "Probe/meter" },
  { value: "lab", label: "Lab test" },
  { value: "estimate", label: "Estimate" },
];

// 5-minute liquid-test wait, the thing reviewers specifically asked for
// timers to track — labelled so a finished notification says which test.
const TIMER_MINUTES = 5;

type ActiveTimer = { id: string; label: string; endsAt: number };

async function loadLogData(tankId: string) {
  const [tank, params, measurements, logEntries] = await Promise.all([
    getTank(tankId),
    getEffectiveParameterDefs(tankId),
    listMeasurementsForTank(tankId),
    listLogEntriesForTank(tankId),
  ]);
  const lastByParam = new Map<string, Awaited<ReturnType<typeof getLastMeasurement>>>();
  for (const p of params) {
    const forParam = measurements.filter((m) => m.parameterId === p.id).sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
    lastByParam.set(p.id, forParam[0]);
  }
  return { tank, params, measurements, logEntries, lastByParam };
}

export default function TankLogPage({ params: routeParams }: { params: Promise<{ id: string }> }) {
  const { id } = use(routeParams);
  const { data } = useLiveQuery(() => loadLogData(id), [id]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [method, setMethod] = useState("liquid_kit");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showWaterChange, setShowWaterChange] = useState(false);
  const [waterChangePct, setWaterChangePct] = useState("25");
  const [maintMessage, setMaintMessage] = useState<string | null>(null);

  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [finishedTimer, setFinishedTimer] = useState<string | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  const [showTargets, setShowTargets] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    for (const t of timers) {
      if (t.endsAt <= now && !notifiedRef.current.has(t.id)) {
        notifiedRef.current.add(t.id);
        setFinishedTimer(t.label);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`${t.label} test ready`, { body: "Your 5-minute wait is up." });
        }
      }
    }
  }, [timers, now]);

  if (!data?.tank) return <Screen>Loading...</Screen>;
  const { tank, params, logEntries, lastByParam } = data;

  function startTimer(label: string) {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setTimers((prev) => [...prev, { id: `${label}-${Date.now()}`, label, endsAt: Date.now() + TIMER_MINUTES * 60000 }]);
  }

  function dismissTimer(timerId: string) {
    setTimers((prev) => prev.filter((t) => t.id !== timerId));
  }

  async function handleSaveReadings() {
    const entries = Object.entries(values).filter(([, v]) => v.trim() !== "");
    if (entries.length === 0) return;
    setSaving(true);
    for (const [parameterId, v] of entries) {
      await addMeasurement({ tankId: id, parameterId, value: Number(v), method, note: note.trim() || undefined });
    }
    setValues({});
    setNote("");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleMaintLog(type: "water_change" | "maintenance", body: string, waterChangedPct?: number) {
    await addLogEntry({ tankId: id, type, body, waterChangedPct });
    setMaintMessage(`Logged: ${body}`);
    setShowWaterChange(false);
  }

  async function handleSaveTarget(param: (typeof params)[number], min: string, max: string) {
    await setTankParameterTarget(
      id,
      { name: param.name, unit: param.unit, decimals: param.decimals, sortOrder: param.sortOrder },
      min.trim() === "" ? null : Number(min),
      max.trim() === "" ? null : Number(max)
    );
  }

  async function handleAddCustom() {
    if (!customName.trim() || !customUnit.trim()) return;
    await addCustomParameter({ tankId: id, name: customName.trim(), unit: customUnit.trim() });
    setCustomName("");
    setCustomUnit("");
  }

  const markers = logEntries
    .filter((e) => e.type === "water_change" || e.type === "maintenance" || e.type === "treatment")
    .map((e) => ({ occurredAt: e.occurredAt, label: e.body ?? e.type ?? "" }));

  return (
    <Screen>
      <BackHeader title="Parameter Log" fallbackHref={`/tank/${tank.id}`} />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>{tank.name}</p>

      {finishedTimer && (
        <div style={{ marginBottom: 16 }}>
          <Banner severity="improve" onDismiss={() => setFinishedTimer(null)}>
            {finishedTimer} test is ready to read.
          </Banner>
        </div>
      )}

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Quick log</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: showWaterChange ? 8 : 0 }}>
          <SecondaryButton onClick={() => setShowWaterChange((v) => !v)}>Water change</SecondaryButton>
          <SecondaryButton onClick={() => handleMaintLog("maintenance", "Feed")}>Feed</SecondaryButton>
          <SecondaryButton onClick={() => handleMaintLog("maintenance", "Dose")}>Dose</SecondaryButton>
          <SecondaryButton onClick={() => handleMaintLog("maintenance", "Filter clean")}>Filter clean</SecondaryButton>
        </div>
        {showWaterChange && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Field label="Percent changed" type="number" value={waterChangePct} onChange={(e) => setWaterChangePct(e.target.value)} />
            </div>
            <PrimaryButton
              style={{ width: "auto" }}
              onClick={() => handleMaintLog("water_change", `Water change (${waterChangePct}%)`, Number(waterChangePct))}
            >
              Log it
            </PrimaryButton>
          </div>
        )}
        {maintMessage && <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 8 }}>{maintMessage}</p>}
      </Card>

      {timers.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Test timers</p>
          {timers.map((t) => {
            const remaining = Math.max(0, Math.round((t.endsAt - now) / 1000));
            const mm = Math.floor(remaining / 60);
            const ss = String(remaining % 60).padStart(2, "0");
            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span>
                  {t.label}: {remaining === 0 ? "Ready!" : `${mm}:${ss}`}
                </span>
                <button onClick={() => dismissTimer(t.id)} style={{ background: "none", border: "none", color: "var(--color-ink-muted)" }}>
                  Dismiss
                </button>
              </div>
            );
          })}
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ fontWeight: 600 }}>Log readings</p>
          <button onClick={() => setShowTargets((v) => !v)} style={{ background: "none", border: "none", color: "var(--color-deep)", fontSize: "var(--font-caption-size)" }}>
            {showTargets ? "Hide targets" : "Edit targets"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {params.map((p) => {
            const last = lastByParam.get(p.id);
            return (
              <div key={p.id}>
                <Field
                  label={`${p.name}${p.unit ? ` (${p.unit})` : ""}`}
                  type="number"
                  step={p.decimals ? 1 / 10 ** p.decimals : 1}
                  value={values[p.id] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder={last ? `last: ${last.value}` : undefined}
                />
                <button
                  onClick={() => startTimer(p.name)}
                  style={{ background: "none", border: "none", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 2 }}
                >
                  ⏱ Start 5-min timer
                </button>
                {showTargets && (
                  <TargetEditor param={p} onSave={(min, max) => handleSaveTarget(p, min, max)} />
                )}
              </div>
            );
          })}
        </div>

        {showTargets && (
          <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: 12, marginBottom: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Add a custom parameter</p>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 2 }}>
                <Field label="" placeholder="Name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="" placeholder="Unit" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} />
              </div>
              <PrimaryButton style={{ width: "auto" }} onClick={handleAddCustom}>
                Add
              </PrimaryButton>
            </div>
          </div>
        )}

        <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ padding: 8, width: "100%", marginBottom: 8 }}>
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div style={{ height: 8 }} />
        <PrimaryButton onClick={handleSaveReadings} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save readings"}
        </PrimaryButton>
      </Card>

      {params.map((p) => {
        const readings = data.measurements.filter((m) => m.parameterId === p.id);
        if (readings.length === 0) return null;
        const last = lastByParam.get(p.id);
        const warning = last ? checkParameterOutOfRange(p.name, last.value, p.targetMin, p.targetMax, p.unit) : null;
        return (
          <Card key={p.id} style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{p.name}</p>
            {warning && (
              <div style={{ marginBottom: 8 }}>
                <Banner severity="watch">{warning.message}</Banner>
              </div>
            )}
            <ParamGraph
              readings={readings.map((r) => ({ value: r.value, measuredAt: r.measuredAt }))}
              targetMin={p.targetMin}
              targetMax={p.targetMax}
              unit={p.unit}
              decimals={p.decimals ?? 1}
              markers={markers}
            />
          </Card>
        );
      })}
    </Screen>
  );
}

function TargetEditor({ param, onSave }: { param: { targetMin: number | null; targetMax: number | null }; onSave: (min: string, max: string) => void }) {
  const [min, setMin] = useState(param.targetMin != null ? String(param.targetMin) : "");
  const [max, setMax] = useState(param.targetMax != null ? String(param.targetMax) : "");
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
      <input
        type="number"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        placeholder="min"
        style={{ width: 60, padding: 4, fontSize: 12 }}
      />
      <input
        type="number"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        placeholder="max"
        style={{ width: 60, padding: 4, fontSize: 12 }}
      />
      <button onClick={() => onSave(min, max)} style={{ fontSize: 12, background: "none", border: "1px solid var(--color-line)", borderRadius: 4 }}>
        Save
      </button>
    </div>
  );
}
