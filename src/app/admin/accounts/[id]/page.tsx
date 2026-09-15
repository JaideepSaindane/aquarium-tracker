"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";

type AiInteraction = {
  id: string;
  kind: string | null;
  userInput: string | null;
  response: string | null;
  costUsd: number | null;
  createdAt: string;
};

type Tank = { id: string; name: string; waterType: string | null; setupType: string | null; createdAt: string };
type Action = { at: string; type: string; label: string };
type PageView = { path: string; createdAt: string };

type AccountDetail = {
  account: { id: string; email: string | null; phone: string | null; name: string | null; createdAt: string };
  tanks: Tank[];
  livestockCount: number;
  aiInteractions: AiInteraction[];
  scans: unknown[];
  pageViews: PageView[];
  installed: boolean;
  installedAt: string | null;
  actions: Action[];
};

/** Safely parses an ai_interactions.response JSON string, returning a plain-language string to display. */
function readAnswerText(kind: string | null, response: string | null): string {
  if (!response) return "(no response recorded)";
  try {
    const parsed = JSON.parse(response);
    if (kind === "ask" && typeof parsed === "object" && parsed && "answer" in parsed) {
      return String((parsed as { answer: unknown }).answer);
    }
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
  } catch {
    return response;
  }
}

/**
 * Full per-account detail page (2026-09-15, Jaideep: an account-wise page
 * with tank counts, API/prompt usage, actions, and full Ask AquaAI chat
 * history per account). This is the individual-account drill-down that
 * /admin's summary page deliberately never shows — see the note in
 * src/app/api/admin/accounts/[id]/route.ts for why this scope change was
 * made deliberately, at Jaideep's explicit request.
 */
export default function AdminAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"actions" | "chats" | "tanks" | "pages">("actions");

  useEffect(() => {
    fetch(`/api/admin/accounts/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          setError(res.status === 403 ? "You don't have access to this page." : res.status === 404 ? "Account not found." : "Couldn't load account.");
          return;
        }
        setData(await res.json());
      })
      .catch(() => setError("Couldn't load account."));
  }, [params.id]);

  if (error) {
    return (
      <Screen>
        <p style={{ color: "var(--color-fix-now)" }}>{error}</p>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
      </Screen>
    );
  }

  const chats = data.aiInteractions.filter((a) => a.kind === "ask");
  const otherAi = data.aiInteractions.filter((a) => a.kind !== "ask");

  return (
    <Screen>
      <Link href="/admin/accounts" style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-deep)" }}>
        ← All accounts
      </Link>
      <h1 style={{ fontSize: "var(--font-title-size)", marginTop: 4, marginBottom: 4 }}>
        {data.account.name || data.account.email || data.account.phone || data.account.id}
      </h1>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 16 }}>
        {data.account.email ?? "no email"} · {data.account.phone ?? "no phone"} · joined {data.account.createdAt.slice(0, 10)}
        {data.installed ? ` · installed ${data.installedAt?.slice(0, 10)}` : " · not installed"}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Tanks", value: data.tanks.length },
          { label: "Fish alive", value: data.livestockCount },
          { label: "AI calls", value: data.aiInteractions.length },
          { label: "Page views", value: data.pageViews.length },
        ].map((s) => (
          <div key={s.label} style={{ padding: 10, borderRadius: "var(--radius-md)", background: "var(--color-surface-alt)", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "var(--font-heading-size)", fontWeight: 700 }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {(
          [
            ["actions", "Actions"],
            ["chats", `Ask AquaAI chats (${chats.length})`],
            ["tanks", `Tanks (${data.tanks.length})`],
            ["pages", `Page views (${data.pageViews.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${tab === value ? "var(--color-deep)" : "var(--color-line)"}`,
              background: tab === value ? "var(--color-deep)" : "transparent",
              color: tab === value ? "#fff" : "var(--color-ink)",
              fontSize: "var(--font-caption-size)",
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "actions" && (
        <Card>
          {data.actions.length === 0 ? (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>No actions recorded yet.</p>
          ) : (
            data.actions.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-line-soft)", fontSize: "var(--font-body-sm-size)" }}>
                <span>{a.label}</span>
                <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{a.at.slice(0, 16).replace("T", " ")}</span>
              </div>
            ))
          )}
        </Card>
      )}

      {tab === "chats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {chats.length === 0 && (
            <Card>
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>No Ask AquaAI questions yet.</p>
            </Card>
          )}
          {chats.map((c) => (
            <Card key={c.id}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--font-body-sm-size)" }}>Q: {c.userInput}</p>
              <p style={{ marginTop: 6, marginBottom: 0, fontSize: "var(--font-body-sm-size)", color: "var(--color-ink)", whiteSpace: "pre-wrap" }}>
                A: {readAnswerText(c.kind, c.response)}
              </p>
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>
                {c.createdAt.slice(0, 16).replace("T", " ")}
              </p>
            </Card>
          ))}
          {otherAi.length > 0 && (
            <Card>
              <p style={{ fontWeight: 700, marginBottom: 6, fontSize: "var(--font-body-sm-size)" }}>Other AI calls ({otherAi.length})</p>
              {otherAi.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>
                  <span>{a.kind}</span>
                  <span>{a.createdAt.slice(0, 16).replace("T", " ")}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {tab === "tanks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.tanks.map((t) => (
            <Card key={t.id}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--font-body-sm-size)" }}>{t.name}</p>
              <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
                {t.waterType ?? "?"} · {t.setupType ?? "?"} · created {t.createdAt.slice(0, 10)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {tab === "pages" && (
        <Card>
          {data.pageViews.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "var(--font-caption-size)", borderBottom: "1px solid var(--color-line-soft)" }}>
              <span>{p.path}</span>
              <span style={{ color: "var(--color-ink-muted)" }}>{p.createdAt.slice(0, 16).replace("T", " ")}</span>
            </div>
          ))}
        </Card>
      )}
    </Screen>
  );
}
