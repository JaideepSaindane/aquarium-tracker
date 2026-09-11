"use client";

import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { useLiveQuery } from "@/db/live";
import { listCommunityReports } from "@/db/queries/community";

/**
 * Hidden, unlinked (same pattern as /dev/species-suggestions) — read-only
 * visibility into reported posts/comments. No approve/hide action queue
 * (Jaideep's explicit MVP scope for Community, 2026-09-11); act on a
 * report manually via the real UI (find the post/comment, delete it) if
 * something actually needs to come down.
 */
export default function CommunityReportsPage() {
  const { data: reports } = useLiveQuery(() => listCommunityReports(), []);

  return (
    <Screen>
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 4 }}>Community reports</h1>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 16 }}>
        Read-only. No admin action here yet — find the reported post/comment in the real app and delete it if needed.
      </p>

      {reports?.length === 0 && <p style={{ color: "var(--color-ink-muted)" }}>No reports.</p>}

      {reports?.map((r) => (
        <Card key={r.id} style={{ marginBottom: 8 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>
            {r.targetType} · {new Date(r.createdAt).toLocaleString()}
          </p>
          <p style={{ margin: "4px 0", fontFamily: "monospace", fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>
            target: {r.targetId}
          </p>
          {r.reason && <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)" }}>&ldquo;{r.reason}&rdquo;</p>}
        </Card>
      ))}
    </Screen>
  );
}
