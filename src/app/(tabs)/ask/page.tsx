"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { GroundingLink } from "@/components/GroundingLink";
import { SecondaryButton } from "@/components/Button";
import { LottiePlayer } from "@/components/LottiePlayer";
import { useLiveQuery } from "@/db/live";
import { listTanks } from "@/db/queries/tanks";
import { listAiInteractions, rateAiInteraction } from "@/db/queries/ai-interactions";
import { askQuestion, peekQuotaStatus, type QuotaStatus } from "@/lib/ai-client";
import { buildTankContext } from "@/lib/tank-context";
import { useLocale } from "@/i18n/use-locale";
import { AskZod, type AskAnswer } from "@/server/ai/schemas/ask";
import styles from "./ask.module.css";

const STARTER_QUESTIONS = ["Is my tank set up correctly?", "What should I be doing this week?", "Can I add more fish?"];

type Stage = "idle" | "loading";
type AiInteractionRow = NonNullable<Awaited<ReturnType<typeof listAiInteractions>>>[number];

/**
 * Ask AquaAI, redesigned 2026-09-05 from a single-shot "ask, get one answer,
 * old answers vanish into a flat list below" form into a real scrolling
 * chat thread — Jaideep's direct ask to make the whole feature more
 * prominent, functionally as well as visually. The data was always there
 * to support this: `ai_interactions.response` already stores the full
 * structured answer for every past turn (T-019), it just wasn't being
 * rendered as anything more than a question title. Now every turn (past or
 * just-asked) renders through the same `AnswerBubble`, oldest at the top,
 * auto-scrolling to the newest — a live query, so a just-logged interaction
 * appears the instant `logAiInteraction` writes it, no separate "current
 * answer" state to keep in sync with history. The input is a real sticky
 * chat composer (`Screen`'s `footer` prop) instead of a form embedded in
 * scrolling content. Ask is now a permanent centered tab in the bottom
 * dock (2026-09-10) rather than a screen the dock hides itself for, so the
 * composer uses `footerAboveDock` to sit above the dock instead of under it.
 */
export default function AskPage() {
  const router = useRouter();
  const { data: tanks } = useLiveQuery(listTanks, []);
  const { data: history } = useLiveQuery(listAiInteractions, []);
  const { locale } = useLocale();

  const [tankId, setTankId] = useState("");
  const [question, setQuestion] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [showDetailIds, setShowDetailIds] = useState<Set<string>>(new Set());
  const [showCorrectionIds, setShowCorrectionIds] = useState<Set<string>>(new Set());
  const [correctionText, setCorrectionText] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    peekQuotaStatus("ask").then(setQuota);
  }, []);

  const askHistory = (history ?? [])
    .filter((h) => h.kind === "ask" && (!tankId || h.tankId === tankId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [askHistory.length, stage]);

  async function handleAsk(q?: string) {
    const finalQuestion = (q ?? question).trim();
    if (!finalQuestion) return;
    setStage("loading");
    setPendingQuestion(finalQuestion);
    setError(null);
    setQuestion("");
    try {
      const tankContext = tankId ? await buildTankContext(tankId) : "(no tank selected)";
      const result = await askQuestion({ question: finalQuestion, tankContext, tankId: tankId || undefined, locale });
      if (!result.ok) {
        setError(result.error);
        setQuestion(finalQuestion);
      } else {
        const parsed = AskZod.safeParse(result.data.answer);
        if (!parsed.success) setError("The answer came back in an unexpected shape. Please try again.");
      }
      peekQuotaStatus("ask").then(setQuota);
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setQuestion(finalQuestion);
    } finally {
      setStage("idle");
      setPendingQuestion(null);
    }
  }

  async function runAction(action: AskAnswer["actions"][number], forTankId: string, key: string) {
    if (action.type === "create_task") {
      setActionMessage((m) => ({ ...m, [key]: "Reminders aren't available in this version." }));
    } else if (action.type === "open_species") {
      const payload = action.payload as { species_id?: string };
      if (payload.species_id) router.push(`/dex/${payload.species_id}`);
    } else if (action.type === "log_measurement") {
      setActionMessage((m) => ({ ...m, [key]: "Parameter logging isn't available yet in this version." }));
    } else if (action.type === "open_corpus") {
      setActionMessage((m) => ({ ...m, [key]: "Corpus browsing isn't available yet in this version." }));
    }
  }

  async function handleRate(id: string, rating: 1 | -1) {
    await rateAiInteraction(id, rating);
    if (rating === -1) setShowCorrectionIds((s) => new Set(s).add(id));
  }

  async function handleSaveCorrection(id: string) {
    await rateAiInteraction(id, -1, correctionText[id]?.trim() || undefined);
    setShowCorrectionIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  const isEarlyBird = quota && !quota.isByok && quota.earlyBird;
  const quotaWarning =
    quota && !quota.isByok && !quota.earlyBird && quota.allowed && quota.limit - quota.used <= 3
      ? `${quota.limit - quota.used} free question${quota.limit - quota.used === 1 ? "" : "s"} left this month.`
      : null;
  const quotaExhausted = quota && !quota.isByok && !quota.earlyBird && !quota.allowed;

  return (
    <Screen
      footerAboveDock
      footer={
        <>
          {isEarlyBird && (
            <p style={{ color: "var(--color-improve)", fontSize: "var(--font-caption-size)" }}>
              🐦 Early Bird — unlimited Ask AquaAI, free, while we build out Pro.
            </p>
          )}
          {quotaWarning && <p style={{ color: "var(--color-watch)", fontSize: "var(--font-caption-size)" }}>{quotaWarning}</p>}
          {quotaExhausted && (
            <Banner severity="watch">
              {"resetsAt" in (quota ?? {}) ? `You've used your free questions this month. Resets ${(quota as { resetsAt: string }).resetsAt}.` : ""}
            </Banner>
          )}
          <div className={styles.composer}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk();
              }}
              placeholder="Ask AquaAI anything..."
              className={styles.composerInput}
              disabled={!!quotaExhausted}
            />
            <button
              type="button"
              onClick={() => handleAsk()}
              disabled={stage === "loading" || !!quotaExhausted || !question.trim()}
              className={styles.sendButton}
              aria-label="Send"
            >
              {stage === "loading" ? "…" : "➤"}
            </button>
          </div>
        </>
      }
    >
      <BackHeader fallbackHref="/" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: "var(--font-title-size)" }}>💬 Ask AquaAI</h1>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>Grounded answers, never a guess dressed up as fact.</p>
        </div>
        <select
          value={tankId}
          onChange={(e) => setTankId(e.target.value)}
          className={styles.tankPicker}
          aria-label="About which tank"
        >
          <option value="">General</option>
          {(tanks ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {askHistory.length === 0 && !pendingQuestion && (
        <div className={styles.emptyState}>
          <LottiePlayer name="listening" size={72} className={styles.emptyStateAnim} />
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Ask me anything about your tank</p>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 16 }}>
            Water parameters, compatibility, a fish acting strangely — I&apos;ll ground the answer in your own tank&apos;s data where I can.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320 }}>
            {STARTER_QUESTIONS.map((q) => (
              <SecondaryButton key={q} onClick={() => handleAsk(q)}>
                {q}
              </SecondaryButton>
            ))}
          </div>
        </div>
      )}

      <div className={styles.thread}>
        {askHistory.map((h) => (
          <Turn
            key={h.id}
            row={h}
            showDetail={showDetailIds.has(h.id)}
            onShowDetail={() => setShowDetailIds((s) => new Set(s).add(h.id))}
            showCorrection={showCorrectionIds.has(h.id)}
            correctionText={correctionText[h.id] ?? ""}
            onCorrectionChange={(v) => setCorrectionText((m) => ({ ...m, [h.id]: v }))}
            onSaveCorrection={() => handleSaveCorrection(h.id)}
            onRate={(r) => handleRate(h.id, r)}
            actionMessage={actionMessage[h.id]}
            onAction={(a) => runAction(a, h.tankId ?? tankId, h.id)}
            onOpenRef={(type, id) => (type === "species" ? router.push(`/dex/${id}`) : type === "corpus" ? router.push(`/corpus/${id}`) : undefined)}
          />
        ))}

        {pendingQuestion && (
          <>
            <div className={styles.userBubbleWrap}>
              <div className={styles.userBubble}>{pendingQuestion}</div>
            </div>
            <div className={styles.assistantBubbleWrap}>
              <div className={styles.thinking}>
                <LottiePlayer name="thinking" size={32} />
              </div>
            </div>
          </>
        )}

        {error && (
          <div style={{ marginTop: 8 }}>
            {error.includes("Couldn't reach the server") ? (
              <div className={styles.offlineNotice}>
                <LottiePlayer name="offline" size={40} />
                <p>{error}</p>
              </div>
            ) : (
              <Banner severity="fixNow">{error}</Banner>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </Screen>
  );
}

/** One question + answer turn, rendered as a right-aligned user bubble and a left-aligned answer card. */
function Turn({
  row,
  showDetail,
  onShowDetail,
  showCorrection,
  correctionText,
  onCorrectionChange,
  onSaveCorrection,
  onRate,
  actionMessage,
  onAction,
  onOpenRef,
}: {
  row: AiInteractionRow;
  showDetail: boolean;
  onShowDetail: () => void;
  showCorrection: boolean;
  correctionText: string;
  onCorrectionChange: (v: string) => void;
  onSaveCorrection: () => void;
  onRate: (r: 1 | -1) => void;
  actionMessage?: string;
  onAction: (a: AskAnswer["actions"][number]) => void;
  onOpenRef: (type: string, id: string) => void;
}) {
  const parsed = AskZod.safeParse(typeof row.response === "string" ? JSON.parse(row.response) : row.response);
  const answer = parsed.success ? parsed.data : null;
  const feedbackGiven = row.rating != null;

  return (
    <>
      <div className={styles.userBubbleWrap}>
        <div className={styles.userBubble}>{row.userInput}</div>
      </div>

      <div className={styles.assistantBubbleWrap}>
        <Card className={styles.answerCard}>
          {!answer ? (
            <p style={{ color: "var(--color-ink-muted)" }}>Couldn&apos;t render this answer.</p>
          ) : (
            <>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>{answer.answer}</p>

              {answer.based_on_your_tank.length > 0 && (
                <div style={{ marginBottom: 10 }}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {answer.actions
                    .filter((a) => a.type !== "none")
                    .map((a, i) => (
                      <SecondaryButton key={i} onClick={() => onAction(a)}>
                        {a.label}
                      </SecondaryButton>
                    ))}
                </div>
              )}
              {actionMessage && <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 8 }}>{actionMessage}</p>}

              {answer.grounding_refs.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {answer.grounding_refs.map((ref) => {
                    const [type, id] = ref.split(":");
                    return <GroundingLink key={ref} label={ref} onOpen={type === "species" || type === "corpus" ? () => onOpenRef(type, id) : undefined} />;
                  })}
                </div>
              )}

              {answer.detail && !showDetail && (
                <SecondaryButton onClick={onShowDetail}>Tell me more</SecondaryButton>
              )}
              {showDetail && answer.detail && <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{answer.detail}</p>}

              <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                {!feedbackGiven ? (
                  <>
                    <button onClick={() => onRate(1)} className={styles.feedbackButton}>
                      👍
                    </button>
                    <button onClick={() => onRate(-1)} className={styles.feedbackButton}>
                      👎
                    </button>
                  </>
                ) : (
                  <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>Thanks for the feedback.</p>
                )}
              </div>

              {showCorrection && (
                <div style={{ marginTop: 10 }}>
                  <input
                    value={correctionText}
                    onChange={(e) => onCorrectionChange(e.target.value)}
                    placeholder="What was wrong? (optional)"
                    className={styles.correctionInput}
                  />
                  <div style={{ height: 8 }} />
                  <SecondaryButton onClick={onSaveCorrection}>Save</SecondaryButton>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
