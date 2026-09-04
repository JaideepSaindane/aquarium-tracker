import fs from "node:fs/promises";
import path from "node:path";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { Chip } from "@/components/Chip";
import { LottiePlayer } from "@/components/LottiePlayer";
import { getCorpusEntry } from "@/server/ai/retrieval";

// Server Component, statically generated (generateStaticParams below) — the
// corpus ships inside the app bundle as plain files, so this route needs no
// client fetch and no OPFS/database access at all, unlike the rest of the
// app. That's what specs/T-004 acceptance criterion 7 ("works in aeroplane
// mode") is actually asking for: this page never touches the network to
// render. (The service worker itself doesn't yet cache routes for a repeat
// *offline* visit — src/app/ServiceWorkerRegister.tsx says so explicitly —
// so a first visit still needs one real network fetch of the page like any
// other route; that's a pre-existing, whole-app gap, not something new to
// this route.)

export async function generateStaticParams() {
  const dir = path.join(process.cwd(), "content", "corpus");
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith(".md")).map((f) => ({ id: f.replace(/\.md$/, "") }));
  } catch {
    return [];
  }
}

const SEVERITY_TO_BANNER = {
  critical: "fixNow",
  high: "fixNow",
  medium: "watch",
  low: "neutral",
} as const;

const TIME_TO_ACT_LABEL: Record<string, string> = {
  now: "Act now",
  "24h": "Within 24 hours",
  "72h": "Within 72 hours",
  "1w": "Within a week",
  routine: "Routine — no rush",
};

export default async function CorpusEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getCorpusEntry(id);

  if (!entry) {
    return (
      <Screen>
        <BackHeader title="Not found" fallbackHref="/" />
        <p style={{ color: "var(--color-ink-muted)" }}>There&apos;s no corpus entry with the id &quot;{id}&quot;.</p>
      </Screen>
    );
  }

  const bannerSeverity = SEVERITY_TO_BANNER[entry.severity as keyof typeof SEVERITY_TO_BANNER] ?? "neutral";
  const isLive = entry.status === "live";
  const escalate = Array.isArray(entry.when_to_escalate) ? entry.when_to_escalate : [entry.when_to_escalate].filter(Boolean);

  return (
    <Screen>
      <BackHeader fallbackHref="/" />
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: -8 }}>
        <LottiePlayer name="grounding" loop={false} size={36} respectReducedMotion />
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", fontWeight: 600 }}>Grounded reference entry</p>
      </div>
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 4, marginTop: 8 }}>{entry.title}</h1>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Chip variant={entry.severity === "critical" || entry.severity === "high" ? "fixNow" : entry.severity === "medium" ? "watch" : "neutral"}>
          {entry.severity}
        </Chip>
        <Chip variant="neutral">{TIME_TO_ACT_LABEL[entry.time_to_act] ?? entry.time_to_act}</Chip>
      </div>

      {!isLive && (
        <div style={{ marginBottom: 16 }}>
          <Banner severity="watch">
            This entry has not yet been signed off by a named human reviewer (status: {entry.status}). Treat everything
            below as a strong draft, not verified fact — especially any dose or treatment step. See{" "}
            <code>docs/05-content-guide.md §7</code> for the review process.
          </Banner>
        </div>
      )}

      {entry.symptoms?.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Symptoms</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {entry.symptoms.map((s, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {entry.immediate_actions?.length > 0 && (
        <Card style={{ marginBottom: 16, borderColor: `var(--color-${bannerSeverity === "fixNow" ? "fix-now" : bannerSeverity === "watch" ? "watch" : "line"})`, borderLeftWidth: 4, borderLeftStyle: "solid" }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>What to do now</p>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {entry.immediate_actions.map((a, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                {a}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {entry.do_not_do?.length > 0 && (
        <Card style={{ marginBottom: 16, borderColor: "var(--color-fix-now)", borderLeftWidth: 4, borderLeftStyle: "solid" }}>
          <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-fix-now)" }}>Do not</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {entry.do_not_do.map((d, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                {d}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {entry.likely_causes?.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Likely causes</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {entry.likely_causes.map((c, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {c}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {entry.treatments?.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Treatment options</p>
          {entry.treatments.map((t, i) => (
            <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < entry.treatments.length - 1 ? "1px solid var(--color-line-soft)" : "none" }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{t.name}</p>
              <p style={{ fontSize: "var(--font-body-sm-size)", marginBottom: 4 }}>
                <strong>Dose:</strong> {t.dose}
              </p>
              <p style={{ fontSize: "var(--font-body-sm-size)", marginBottom: 4 }}>
                <strong>Duration:</strong> {t.duration}
              </p>
              {t.dangerous_to?.length > 0 && (
                <p style={{ fontSize: "var(--font-body-sm-size)", marginBottom: 4, color: "var(--color-fix-now)" }}>
                  <strong>Dangerous to:</strong> {t.dangerous_to.join(", ")}
                </p>
              )}
              {t.notes && (
                <p style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-ink-muted)", marginBottom: 4 }}>{t.notes}</p>
              )}
              {t.source && (
                <a href={t.source} target="_blank" rel="noreferrer" style={{ fontSize: "var(--font-caption-size)", color: "var(--color-deep)" }}>
                  Source
                </a>
              )}
            </div>
          ))}
        </Card>
      )}

      {escalate.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>When to escalate to a vet or experienced keeper</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {escalate.map((e, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {e}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <p style={{ whiteSpace: "pre-wrap", color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.6 }}>{entry.body}</p>
      </Card>

      {entry.sources?.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Sources</p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: "var(--font-caption-size)" }}>
            {entry.sources.map((s, i) => (
              <li key={i} style={{ marginBottom: 4, wordBreak: "break-all" }}>
                <a href={s} target="_blank" rel="noreferrer" style={{ color: "var(--color-deep)" }}>
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", textAlign: "center" }}>
        {isLive ? `Reviewed by ${entry.last_reviewed_by} · ${entry.last_reviewed_on}` : `Not yet reviewed · last edited ${entry.last_reviewed_on}`}
      </p>
    </Screen>
  );
}
