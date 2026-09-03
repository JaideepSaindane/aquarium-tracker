"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { Field } from "@/components/Field";
import { GroundingLink } from "@/components/GroundingLink";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { useLiveQuery } from "@/db/live";
import { listTanks } from "@/db/queries/tanks";
import { listAiInteractions, rateAiInteraction } from "@/db/queries/ai-interactions";
import { createTask } from "@/db/queries/tasks";
import { askQuestion, peekQuotaStatus, type QuotaStatus } from "@/lib/ai-client";
import { syncReminder } from "@/lib/push-client";
import { presetRrule } from "@/lib/reminder-presets";
import { buildTankContext } from "@/lib/tank-context";
import { useLocale } from "@/i18n/use-locale";
import { AskZod, type AskAnswer } from "@/server/ai/schemas/ask";

const STARTER_QUESTIONS = ["Is my tank set up correctly?", "What should I be doing this week?", "Can I add more fish?"];

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

type Stage = "idle" | "loading" | "error";

export default function AskPage() {
  const { data: tanks } = useLiveQuery(listTanks, []);
  const { data: history } = useLiveQuery(listAiInteractions, []);

  const [tankId, setTankId] = useState("");
  const [question, setQuestion] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const router = useRouter();
  const { locale } = useLocale();

  useEffect(() => {
    peekQuotaStatus("ask").then(setQuota);
  }, []);

  const askHistory = (history ?? [])
    .filter((h) => h.kind === "ask" && (!tankId || h.tankId === tankId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function handleAsk(q?: string) {
    const finalQuestion = (q ?? question).trim();
    if (!finalQuestion) return;
    setStage("loading");
    setError(null);
    setAnswer(null);
    setActionMessage(null);
    setFeedbackGiven(false);
    setShowCorrection(false);
    try {
      const tankContext = tankId ? await buildTankContext(tankId) : "(no tank selected)";
      const result = await askQuestion({ question: finalQuestion, tankContext, tankId: tankId || undefined, locale });
      if (!result.ok) {
        setError(result.error);
        setStage("idle");
        return;
      }
      const parsed = AskZod.safeParse(result.data.answer);
      if (!parsed.success) {
        setError("The answer came back in an unexpected shape. Please try again.");
        setStage("idle");
        return;
      }
      setAnswer(parsed.data);
      setInteractionId(result.data.interactionId ?? null);
      setQuestion("");
      setStage("idle");
      peekQuotaStatus("ask").then(setQuota);
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setStage("idle");
    }
  }

  async function runAction(action: AskAnswer["actions"][number]) {
    if (action.type === "create_task" && tankId) {
      const payload = action.payload as { preset_type?: string; title?: string; interval_days?: number };
      const intervalDays = payload.interval_days ?? 7;
      const title = payload.title ?? action.label;
      const nextDueAt = daysFromNow(intervalDays);
      const rrule = presetRrule(intervalDays);
      const tank = tanks?.find((t) => t.id === tankId);
      const taskId = await createTask({ tankId, title, presetType: payload.preset_type, rrule, nextDueAt });
      await syncReminder({ taskId, title, tankId, tankName: tank?.name ?? "Tank", dueAt: nextDueAt, rrule });
      setActionMessage(`Reminder created: ${title}`);
    } else if (action.type === "open_species") {
      const payload = action.payload as { species_id?: string };
      if (payload.species_id) router.push(`/dex/${payload.species_id}`);
    } else if (action.type === "log_measurement") {
      setActionMessage("Parameter logging isn't available yet in this version.");
    } else if (action.type === "open_corpus") {
      setActionMessage("Corpus browsing isn't available yet in this version.");
    }
  }

  async function handleRate(rating: 1 | -1) {
    if (!interactionId) return;
    await rateAiInteraction(interactionId, rating);
    setFeedbackGiven(true);
    if (rating === -1) setShowCorrection(true);
  }

  async function handleSaveCorrection() {
    if (!interactionId) return;
    await rateAiInteraction(interactionId, -1, correctionText.trim() || undefined);
    setShowCorrection(false);
  }

  const isEarlyBird = quota && !quota.isByok && quota.earlyBird;
  const quotaWarning =
    quota && !quota.isByok && !quota.earlyBird && quota.allowed && quota.limit - quota.used <= 3
      ? `${quota.limit - quota.used} free question${quota.limit - quota.used === 1 ? "" : "s"} left this month.`
      : null;
  const quotaExhausted = quota && !quota.isByok && !quota.earlyBird && !quota.allowed;

  return (
    <Screen>
      <BackHeader fallbackHref="/" />
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 4 }}>Ask AquaAI</h1>
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>Ask anything — grounded answers, never a guess dressed up as fact.</p>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>About which tank? (optional)</p>
        <select
          value={tankId}
          onChange={(e) => setTankId(e.target.value)}
          style={{
            padding: "10px 12px",
            width: "100%",
            marginBottom: 12,
            borderRadius: "var(--radius-md)",
            border: "1px solid transparent",
            background: "var(--color-surface-alt)",
            color: "var(--color-ink)",
            minHeight: 44,
          }}
        >
          <option value="">General question</option>
          {(tanks ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <Field label="" placeholder="e.g. Can I add an angelfish?" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <div style={{ height: 8 }} />
        <PrimaryButton onClick={() => handleAsk()} disabled={stage === "loading" || !!quotaExhausted}>
          {stage === "loading" ? "Thinking..." : "Ask"}
        </PrimaryButton>

        {isEarlyBird && (
          <p style={{ color: "var(--color-improve)", fontSize: "var(--font-caption-size)", marginTop: 8 }}>
            🐦 Early Bird — unlimited Ask AquaAI, free, while we build out Pro.
          </p>
        )}
        {quotaWarning && (
          <p style={{ color: "var(--color-watch)", fontSize: "var(--font-caption-size)", marginTop: 8 }}>{quotaWarning}</p>
        )}
        {quotaExhausted && (
          <div style={{ marginTop: 8 }}>
            <Banner severity="watch">
              {"resetsAt" in (quota ?? {}) ? `You've used your free questions this month. Resets ${(quota as { resetsAt: string }).resetsAt}.` : ""}
            </Banner>
          </div>
        )}
      </Card>

      {!answer && stage !== "loading" && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Or try one of these</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STARTER_QUESTIONS.map((q) => (
              <SecondaryButton key={q} onClick={() => handleAsk(q)}>
                {q}
              </SecondaryButton>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Banner severity="fixNow">{error}</Banner>
        </div>
      )}

      {answer && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ fontSize: "var(--font-heading-size)", fontWeight: 600, marginBottom: 12 }}>{answer.answer}</p>

          {answer.based_on_your_tank.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 600, fontSize: "var(--font-caption-size)", marginBottom: 4 }}>Based on your tank</p>
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
                {answer.based_on_your_tank.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {answer.warnings.map((w, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <Banner severity={w.severity === "critical" ? "fixNow" : "watch"}>{w.text}</Banner>
            </div>
          ))}

          {answer.uncovered && (
            <div style={{ marginBottom: 8 }}>
              <Banner severity="neutral">We don&apos;t have grounded guidance on this specific question yet — flagged for review.</Banner>
            </div>
          )}

          {answer.actions.filter((a) => a.type !== "none").length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {answer.actions
                .filter((a) => a.type !== "none")
                .map((a, i) => (
                  <SecondaryButton key={i} onClick={() => runAction(a)}>
                    {a.label}
                  </SecondaryButton>
                ))}
            </div>
          )}
          {actionMessage && <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 8 }}>{actionMessage}</p>}

          {answer.grounding_refs.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {answer.grounding_refs.map((ref) => {
                const [type, id] = ref.split(":");
                return (
                  <GroundingLink
                    key={ref}
                    label={ref}
                    onOpen={type === "species" ? () => router.push(`/dex/${id}`) : type === "corpus" ? () => router.push(`/corpus/${id}`) : undefined}
                  />
                );
              })}
            </div>
          )}

          {answer.detail && !showDetail && <SecondaryButton onClick={() => setShowDetail(true)}>Tell me more</SecondaryButton>}
          {showDetail && <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{answer.detail}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
            {!feedbackGiven ? (
              <>
                <button onClick={() => handleRate(1)} style={{ background: "var(--color-surface-alt)", border: "none", borderRadius: "var(--radius-md)", padding: "8px 14px", fontWeight: 600 }}>
                  👍 Helpful
                </button>
                <button onClick={() => handleRate(-1)} style={{ background: "var(--color-surface-alt)", border: "none", borderRadius: "var(--radius-md)", padding: "8px 14px", fontWeight: 600 }}>
                  👎 This was wrong
                </button>
              </>
            ) : (
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>Thanks for the feedback.</p>
            )}
          </div>

          {showCorrection && (
            <div style={{ marginTop: 12 }}>
              <Field label="What was wrong? (optional)" value={correctionText} onChange={(e) => setCorrectionText(e.target.value)} />
              <div style={{ height: 8 }} />
              <SecondaryButton onClick={handleSaveCorrection}>Save</SecondaryButton>
            </div>
          )}
        </Card>
      )}

      {askHistory.length > 0 && (
        <div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Past questions</p>
          {askHistory.map((h) => (
            <Card key={h.id} style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>{h.userInput}</p>
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{new Date(h.createdAt).toLocaleDateString()}</p>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  );
}
