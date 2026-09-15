"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { MetricsGraphs } from "./MetricsGraphs";
import { FeedbackTab } from "./FeedbackTab";

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
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"summary" | "feedback">("summary");

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/admin/accounts" style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-deep)" }}>
            Accounts →
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            style={{ background: "none", border: "none", color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", cursor: "pointer" }}
          >
            Log out
          </button>
        </div>
      </div>

      <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(
          [
            ["summary", "Summary"],
            ["feedback", "Feedback"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${view === value ? "var(--color-deep)" : "var(--color-line)"}`,
              background: view === value ? "var(--color-deep)" : "transparent",
              color: view === value ? "#fff" : "var(--color-ink)",
              fontSize: "var(--font-body-sm-size)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "feedback" && <FeedbackTab />}

      {view === "summary" && (
      <>
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

      <MetricsGraphs />

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
      </>
      )}
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
