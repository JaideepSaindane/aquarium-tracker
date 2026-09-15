"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";

type FeedbackRow = {
  id: string;
  userId: string;
  source: string;
  body: string;
  createdAt: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

const SOURCE_LABEL: Record<string, string> = { home: "Home", ask: "Ask Aqua", settings: "Settings" };

/** Admin dashboard "Feedback" tab: every submission, newest first, with who sent it and from which screen. */
export function FeedbackTab() {
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        setRows((await res.json()).feedback);
      })
      .catch(() => setError("Couldn't load feedback."));
  }, []);

  if (error) return <p style={{ color: "var(--color-fix-now)" }}>{error}</p>;
  if (!rows) return <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>;
  if (rows.length === 0) return <p style={{ color: "var(--color-ink-muted)" }}>No feedback yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{rows.length} submissions</p>
      {rows.map((f) => (
        <Card key={f.id}>
          <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{f.body}</p>
          <p style={{ margin: 0, fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>
            <Link href={`/admin/accounts/${f.userId}`} style={{ color: "var(--color-deep)", fontWeight: 600 }}>
              {f.name || f.email || f.phone || "Unknown user"}
            </Link>
            {" · "}
            {SOURCE_LABEL[f.source] ?? f.source}
            {" · "}
            {new Date(f.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
          </p>
        </Card>
      ))}
    </div>
  );
}
