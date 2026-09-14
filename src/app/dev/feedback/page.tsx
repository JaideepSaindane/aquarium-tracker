"use client";

import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { useLiveQuery } from "@/db/live";
import { listFeedback } from "@/db/queries/feedback";

/**
 * Hidden, unlinked (same pattern as /dev/community-reports) — read-only
 * visibility into feedback submitted from Home/Ask/Settings. Server-side
 * gated to the admin allowlist (requireAdminUserId, defaults to Jaideep's
 * own account) so this is effectively "goes to my master account" without
 * needing an email provider.
 */
export default function FeedbackViewerPage() {
  const { data: rows } = useLiveQuery(() => listFeedback(), []);

  return (
    <Screen>
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 4 }}>Feedback</h1>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 16 }}>
        Read-only. Submitted from Home, Ask AquaAI, and Settings.
      </p>

      {rows?.length === 0 && <p style={{ color: "var(--color-ink-muted)" }}>No feedback yet.</p>}

      {rows?.map((r) => (
        <Card key={r.id} style={{ marginBottom: 8 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>
            {r.source} · {new Date(r.createdAt).toLocaleString()}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "var(--font-body-sm-size)", whiteSpace: "pre-wrap" }}>{r.body}</p>
        </Card>
      ))}
    </Screen>
  );
}
