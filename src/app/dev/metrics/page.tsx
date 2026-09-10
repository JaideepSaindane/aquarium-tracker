"use client";

// Hidden developer screen (T-026) — not linked from any nav, reached only
// by typing the URL. Shows the numbers docs/00-product-plan.md §8 commits
// to, computed locally from whatever's already in this device's database.
// No analytics SDK, no server aggregation — see specs/T-026 "In scope."
import { useLiveQuery } from "@/db/live";
import { listTanks } from "@/db/queries/tanks";
import { listAllLivestock } from "@/db/queries/livestock";
import { listAllLogEntries } from "@/db/queries/log-entries";
import { listAllMeasurements } from "@/db/queries/measurements";
import { listAiInteractions } from "@/db/queries/ai-interactions";
import { listAllScans } from "@/db/queries/scans";
import { getInstalledAt } from "@/db/queries/settings";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import {
  computeActiveTanks,
  computeActivation,
  computeLoggingRetentionDays,
  computeAiTrust,
  compute90DaySurvival,
} from "@/lib/metrics";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-line)" }}>
      <span style={{ color: "var(--color-ink-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function MetricsDevPage() {
  const { data: tanks } = useLiveQuery(listTanks, []);
  const { data: livestockRows } = useLiveQuery(listAllLivestock, []);
  const { data: logEntryRows } = useLiveQuery(listAllLogEntries, []);
  const { data: measurementRows } = useLiveQuery(listAllMeasurements, []);
  const { data: interactionRows } = useLiveQuery(listAiInteractions, []);
  const { data: scanRows } = useLiveQuery(listAllScans, []);
  const [installedAt, setInstalledAt] = useState<string | null>(null);
  const [installedDaysAgo, setInstalledDaysAgo] = useState<number | null>(null);

  useEffect(() => {
    getInstalledAt().then((at) => {
      setInstalledAt(at);
      setInstalledDaysAgo(at ? Math.floor((Date.now() - new Date(at).getTime()) / 86400000) : null);
    });
  }, []);

  const loaded = tanks && livestockRows && logEntryRows && measurementRows && interactionRows && scanRows;

  if (!loaded) {
    return (
      <Screen>
        <p>Loading...</p>
      </Screen>
    );
  }

  const active = computeActiveTanks(tanks, logEntryRows, measurementRows);
  const activation = computeActivation(tanks, scanRows, logEntryRows, installedAt);
  const retentionDays = computeLoggingRetentionDays(logEntryRows, measurementRows, installedAt);
  const trust = computeAiTrust(interactionRows);
  const survival = compute90DaySurvival(livestockRows);

  return (
    <Screen>
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 4 }}>Metrics (dev only)</h1>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 16 }}>
        Computed locally from this device&apos;s database only. Not sent anywhere.
      </p>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Install</h2>
        <Row label="Installed at" value={installedAt ?? "not recorded yet"} />
        <Row label="Days since install" value={installedDaysAgo === null ? "—" : String(installedDaysAgo)} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Active tanks</h2>
        <Row label="Active (activity in last 14 days)" value={`${active.activeCount} / ${active.totalCount}`} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Activation</h2>
        <Row label="Tank + scan + log within 48h of install" value={activation.activated ? "Yes" : "No"} />
        <Row label="Reason" value={activation.reason} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Logging retention</h2>
        <Row label="Distinct days with a log action" value={String(retentionDays)} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>AI trust</h2>
        <Row label="Total answers" value={String(trust.totalAnswers)} />
        <Row label="Thumbs up per 1,000" value={String(trust.thumbsUpPer1000)} />
        <Row label="Thumbs down per 1,000" value={String(trust.thumbsDownPer1000)} />
        <Row label="'This was wrong' reports per 1,000" value={String(trust.wrongReportsPer1000)} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>90-day survival</h2>
        <Row label="Livestock added 90+ days ago" value={String(survival.eligibleCount)} />
        <Row label="Still alive" value={String(survival.aliveCount)} />
        <Row label="Survival rate" value={survival.survivalPct === null ? "no data yet" : `${survival.survivalPct}%`} />
      </Card>
    </Screen>
  );
}
