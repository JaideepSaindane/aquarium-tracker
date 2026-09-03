"use client";

// Hidden admin/"master" screen — not linked from any nav, reached only by
// typing the URL, same pattern as /dev/db and /dev/metrics. Reviews the
// "suggest this fish for our catalog" submissions people send from the Dex
// photo-scan search (src/app/(tabs)/dex/page.tsx) when a scan doesn't match
// anything in the catalog.
//
// Deliberately local-only for now: these suggestions live in this device's
// own SQLite (species_suggestions table), the same as everything else per
// CLAUDE.md. That's fine for solo testing on one phone, but it means a
// suggestion submitted on someone else's phone never reaches this screen —
// there's no server to carry it over. If/when real users are expected to
// submit these from their own devices, this needs the same kind of narrow
// server-side mirror push reminders use (specs/T-018, specs/PROGRESS.md's
// 2026-09-01 decision) — flagging rather than silently building that now,
// since it's a real architectural call.
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { useLiveQuery } from "@/db/live";
import { listSpeciesSuggestions, setSpeciesSuggestionStatus, type PhotoCandidate } from "@/db/queries/species-suggestions";
import { TankThumbnail } from "@/components/TankThumbnail";

function parseCandidates(json: string | null): PhotoCandidate[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
const STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-watch)",
  approved: "var(--color-improve)",
  rejected: "var(--color-fix-now)",
};

export default function SpeciesSuggestionsPage() {
  const { data: suggestions } = useLiveQuery(listSpeciesSuggestions, []);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = (suggestions ?? []).filter((s) => filter === "all" || s.status === "pending");

  async function review(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    await setSpeciesSuggestionStatus(id, status);
    setBusyId(null);
  }

  return (
    <Screen>
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 4 }}>Species suggestions</h1>
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
        Fish people scanned that didn&apos;t match our catalog. Review and approve the ones worth adding.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setFilter("pending")}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--color-line)",
            background: filter === "pending" ? "var(--color-deep)" : "transparent",
            color: filter === "pending" ? "#fff" : "var(--color-ink)",
            fontSize: "var(--font-caption-size)",
            fontWeight: 700,
          }}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--color-line)",
            background: filter === "all" ? "var(--color-deep)" : "transparent",
            color: filter === "all" ? "#fff" : "var(--color-ink)",
            fontSize: "var(--font-caption-size)",
            fontWeight: 700,
          }}
        >
          All
        </button>
      </div>

      {rows.length === 0 && (
        <p style={{ color: "var(--color-ink-muted)", textAlign: "center", marginTop: 32 }}>
          {filter === "pending" ? "Nothing pending review." : "No suggestions yet."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((s) => {
          const candidates = parseCandidates(s.aiCandidates);
          return (
            <Card key={s.id}>
              <div style={{ display: "flex", gap: 12 }}>
                <TankThumbnail photoUri={s.photoUri} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <p style={{ fontWeight: 700 }}>{s.suggestedName}</p>
                    <Chip variant="neutral">
                      <span style={{ color: STATUS_COLOR[s.status] }}>{STATUS_LABEL[s.status] ?? s.status}</span>
                    </Chip>
                  </div>
                  <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
                    {new Date(s.createdAt).toLocaleString()}
                  </p>
                  {s.note && <p style={{ fontSize: "var(--font-body-sm-size)", marginTop: 6 }}>{s.note}</p>}
                </div>
              </div>

              {candidates.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-line)" }}>
                  <p style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 4 }}>
                    AI&apos;s closest catalog guesses (for context — not authoritative):
                  </p>
                  {candidates.map((c) => (
                    <p key={c.species_id} style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>
                      {c.common_name} ({Math.round(c.confidence * 100)}%) — {c.why}
                    </p>
                  ))}
                </div>
              )}

              {s.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => review(s.id, "approved")}
                    disabled={busyId === s.id}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      background: "var(--color-improve)",
                      color: "#fff",
                      fontWeight: 700,
                      opacity: busyId === s.id ? 0.6 : 1,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => review(s.id, "rejected")}
                    disabled={busyId === s.id}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-line)",
                      background: "transparent",
                      color: "var(--color-ink)",
                      fontWeight: 700,
                      opacity: busyId === s.id ? 0.6 : 1,
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Screen>
  );
}
