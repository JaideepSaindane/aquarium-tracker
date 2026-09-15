"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";

type DayCount = { day: string; n: number };

type Stats = {
  accounts: { total: number; phoneOnly: number; googleOnly: number; both: number };
  signupsPerDay: DayCount[];
  installsPerDay: DayCount[];
  tanksPerDay: DayCount[];
  pageViewsPerDay: DayCount[];
  aiCallsPerDay: DayCount[];
  totalInstalls: number;
  totalPageViews: number;
  tanks: number;
  aliveLivestock: number;
  scans: number;
  journalEntries: number;
  ai: {
    totalInteractions: number;
    byKind: { kind: string | null; n: number; costUsd: number }[];
    ratings: { rating: number | null; n: number }[];
  };
  community: { posts: number; comments: number; likes: number; pendingReports: number };
};

/**
 * Private usage dashboard (T-030, 2026-09-11) — Jaideep: "a dashboard for
 * me to track overall usage, number of accounts, what they're doing." A
 * separate URL, not linked from the app's own nav ("this can live outside
 * of the app") — gated to admin emails only (src/server/auth/require-admin.ts;
 * no real admin-role system exists yet, this is the minimal version).
 *
 * This summary page stays aggregate-only, as originally scoped. 2026-09-15:
 * Jaideep explicitly asked for an account-wise drill-down too, including
 * reading individual users' Ask AquaAI chat history — a deliberate reversal
 * of this page's original "never shows individual content" rule, made at
 * his direct request (see CLAUDE.md's Principle 4 note). That per-account
 * view lives at /admin/accounts, a separate surface from this one.
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) {
          setError(res.status === 403 ? "You don't have access to this page." : "Couldn't load stats.");
          return;
        }
        setStats(await res.json());
      })
      .catch(() => setError("Couldn't load stats."));
  }, []);

  if (error) {
    return (
      <Screen>
        <p style={{ color: "var(--color-fix-now)" }}>{error}</p>
      </Screen>
    );
  }

  if (!stats) {
    return (
      <Screen>
        <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: "var(--font-title-size)" }}>Usage Dashboard</h1>
        <Link href="/admin/accounts" style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-deep)" }}>
          Accounts →
        </Link>
      </div>

      <StatGrid
        items={[
          { label: "Total accounts", value: stats.accounts.total },
          { label: "Phone only", value: stats.accounts.phoneOnly },
          { label: "Google only", value: stats.accounts.googleOnly },
          { label: "Both linked", value: stats.accounts.both },
        ]}
      />

      <StatGrid
        items={[
          { label: "Total installs", value: stats.totalInstalls },
          { label: "Total page views", value: stats.totalPageViews },
        ]}
      />

      <DayChart title="Signups — last 14 days" data={stats.signupsPerDay} />
      <DayChart title="App installs — last 14 days" data={stats.installsPerDay} />
      <DayChart title="Tanks created — last 14 days" data={stats.tanksPerDay} />
      <DayChart title="Page views — last 14 days" data={stats.pageViewsPerDay} />
      <DayChart title="AI calls — last 14 days" data={stats.aiCallsPerDay} />

      <StatGrid
        items={[
          { label: "Tanks", value: stats.tanks },
          { label: "Fish/shrimp alive", value: stats.aliveLivestock },
          { label: "Tank scans run", value: stats.scans },
          { label: "Journal entries", value: stats.journalEntries },
        ]}
      />

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>AI usage</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
          {stats.ai.totalInteractions} total calls
        </p>
        {stats.ai.byKind.map((k) => (
          <div key={k.kind ?? "unknown"} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-body-sm-size)", padding: "4px 0", borderBottom: "1px solid var(--color-line-soft)" }}>
            <span>{k.kind ?? "unknown"}</span>
            <span style={{ color: "var(--color-ink-muted)" }}>
              {k.n} calls · ${k.costUsd.toFixed(4)}
            </span>
          </div>
        ))}
        <p style={{ marginTop: 12, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>
          {stats.ai.ratings.map((r) => `${r.rating === 1 ? "👍" : r.rating === -1 ? "👎" : "unrated"}: ${r.n}`).join("  ·  ")}
        </p>
      </Card>

      <Card>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 12 }}>Community</h2>
        <StatGrid
          items={[
            { label: "Posts", value: stats.community.posts },
            { label: "Comments", value: stats.community.comments },
            { label: "Likes", value: stats.community.likes },
            { label: "Pending reports", value: stats.community.pendingReports },
          ]}
          noMargin
        />
      </Card>
    </Screen>
  );
}

function DayChart({ title, data }: { title: string; data: DayCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <Card style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 12 }}>{title}</h2>
      {data.length === 0 ? (
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>Nothing in this window.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {data.map((d) => (
            <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 90, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>{d.day}</span>
              <div style={{ flex: 1, background: "var(--color-surface-alt)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(d.n / max) * 100}%`, background: "var(--color-deep)", height: 14, minWidth: 4 }} />
              </div>
              <span style={{ width: 24, textAlign: "right", fontSize: "var(--font-caption-size)", fontWeight: 600 }}>{d.n}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StatGrid({ items, noMargin }: { items: { label: string; value: number }[]; noMargin?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: noMargin ? 0 : 16 }}>
      {items.map((item) => (
        <div key={item.label} style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--color-surface-alt)" }}>
          <p style={{ margin: 0, fontSize: "var(--font-title-size)", fontWeight: 700 }}>{item.value}</p>
          <p style={{ margin: 0, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}
