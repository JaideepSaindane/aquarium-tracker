"use client";

import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";

type Stats = {
  accounts: { total: number; phoneOnly: number; googleOnly: number; both: number };
  signupsPerDay: { day: string; n: number }[];
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
 * Aggregate counts only — deliberately never shows an individual user's
 * own tank/fish/journal/chat content, per CLAUDE.md's "their data is
 * theirs" and T-030's own "reporting surface, not a support tool" scope.
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

  const maxSignups = Math.max(1, ...stats.signupsPerDay.map((d) => d.n));

  return (
    <Screen>
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 16 }}>Usage Dashboard</h1>

      <StatGrid
        items={[
          { label: "Total accounts", value: stats.accounts.total },
          { label: "Phone only", value: stats.accounts.phoneOnly },
          { label: "Google only", value: stats.accounts.googleOnly },
          { label: "Both linked", value: stats.accounts.both },
        ]}
      />

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 12 }}>Signups — last 14 days</h2>
        {stats.signupsPerDay.length === 0 ? (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>No signups in this window.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {stats.signupsPerDay.map((d) => (
              <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 90, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>{d.day}</span>
                <div style={{ flex: 1, background: "var(--color-surface-alt)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(d.n / maxSignups) * 100}%`, background: "var(--color-deep)", height: 14, minWidth: 4 }} />
                </div>
                <span style={{ width: 24, textAlign: "right", fontSize: "var(--font-caption-size)", fontWeight: 600 }}>{d.n}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

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
