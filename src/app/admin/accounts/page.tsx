"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";

type Account = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: string;
  tankCount: number;
  aiInteractionCount: number;
  scanCount: number;
  pageViewCount: number;
  installed: boolean;
  lastActiveAt: string | null;
};

/**
 * Account-wise admin page (2026-09-15, Jaideep: "an account-wise page").
 * One row per real account, linking to its own full detail/activity/AI-chat
 * page. This — unlike the aggregate-only summary at /admin — deliberately
 * exposes individual accounts' identity and usage; see the note in
 * src/app/api/admin/accounts/route.ts for the record of that decision.
 */
export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"createdAt" | "lastActiveAt" | "aiInteractionCount" | "tankCount">("createdAt");

  useEffect(() => {
    fetch("/api/admin/accounts")
      .then(async (res) => {
        if (!res.ok) {
          setError(res.status === 403 ? "You don't have access to this page." : "Couldn't load accounts.");
          return;
        }
        const data = await res.json();
        setAccounts(data.accounts);
      })
      .catch(() => setError("Couldn't load accounts."));
  }, []);

  if (error) {
    return (
      <Screen>
        <p style={{ color: "var(--color-fix-now)" }}>{error}</p>
      </Screen>
    );
  }

  if (!accounts) {
    return (
      <Screen>
        <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
      </Screen>
    );
  }

  const sorted = [...accounts].sort((a, b) => {
    if (sortBy === "createdAt") return b.createdAt < a.createdAt ? -1 : 1;
    if (sortBy === "lastActiveAt") return (b.lastActiveAt ?? "") < (a.lastActiveAt ?? "") ? -1 : 1;
    return (b[sortBy] as number) - (a[sortBy] as number);
  });

  return (
    <Screen>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: "var(--font-title-size)" }}>Accounts</h1>
        <Link href="/admin" style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-deep)" }}>
          ← Summary
        </Link>
      </div>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 16 }}>{accounts.length} accounts total</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {(
          [
            ["createdAt", "Sort: newest"],
            ["lastActiveAt", "Sort: last active"],
            ["aiInteractionCount", "Sort: most AI calls"],
            ["tankCount", "Sort: most tanks"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSortBy(value)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${sortBy === value ? "var(--color-deep)" : "var(--color-line)"}`,
              background: sortBy === value ? "var(--color-deep)" : "transparent",
              color: sortBy === value ? "#fff" : "var(--color-ink)",
              fontSize: "var(--font-caption-size)",
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((a) => (
          <Link key={a.id} href={`/admin/accounts/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--font-body-size)" }}>
                    {a.name || a.email || a.phone || a.id.slice(0, 8)}
                  </p>
                  <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
                    {a.email ?? a.phone ?? "—"} · joined {a.createdAt.slice(0, 10)}
                    {a.installed ? " · 📲 installed" : ""}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>
                  <div>{a.tankCount} tanks</div>
                  <div>{a.aiInteractionCount} AI calls</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Screen>
  );
}
