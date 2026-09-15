"use client";

import { useState } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { LottiePlayer } from "@/components/LottiePlayer";
import { useLiveQuery } from "@/db/live";
import { listTanks } from "@/db/queries/tanks";
import { addLogEntry } from "@/db/queries/log-entries";
import { runTriage } from "@/lib/ai-client";
import { TriageZod, type TriageReport } from "@/server/ai/schemas/triage";
import { useLocale } from "@/i18n/use-locale";
import { useTranslation } from "@/i18n/use-translation";

type Stage = "intake" | "loading" | "result" | "error";

export default function EmergencyPage() {
  const { locale } = useLocale();
  const t = useTranslation();
  const SYMPTOMS = [
    t.emergencyPage.symptoms.spots,
    t.emergencyPage.symptoms.fuzzyPatches,
    t.emergencyPage.symptoms.clampedFins,
    t.emergencyPage.symptoms.gaspingAtSurface,
    t.emergencyPage.symptoms.lyingOnBottom,
    t.emergencyPage.symptoms.notEating,
    t.emergencyPage.symptoms.suddenDeaths,
    t.emergencyPage.symptoms.cloudyWater,
    t.emergencyPage.symptoms.other,
  ];
  const AFFECTED_OPTIONS = [t.emergencyPage.affectedOptions.justOne, t.emergencyPage.affectedOptions.aFew, t.emergencyPage.affectedOptions.most, t.emergencyPage.affectedOptions.all];
  const DURATION_OPTIONS = [
    t.emergencyPage.durationOptions.underHour,
    t.emergencyPage.durationOptions.fewHours,
    t.emergencyPage.durationOptions.aboutDay,
    t.emergencyPage.durationOptions.severalDays,
    t.emergencyPage.durationOptions.notSure,
  ];
  const WATER_TEST_OPTIONS = [t.emergencyPage.waterTestOptions.fine, t.emergencyPage.waterTestOptions.off, t.emergencyPage.waterTestOptions.havent];
  const { data: tanks } = useLiveQuery(listTanks, []);
  const [stage, setStage] = useState<Stage>("intake");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [affected, setAffected] = useState(AFFECTED_OPTIONS[0]);
  const [duration, setDuration] = useState(DURATION_OPTIONS[0]);
  const [waterTest, setWaterTest] = useState(WATER_TEST_OPTIONS[2]);
  const [tankId, setTankId] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [report, setReport] = useState<TriageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIncident, setSavedIncident] = useState(false);
  // Answers to the report's own clarifying_questions — Jaideep: "we ask
  // followup questions, but no way to answer them." Kept as free text per
  // question rather than one big box, so each answer stays attached to the
  // question that asked for it.
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [baseDescription, setBaseDescription] = useState("");

  function toggleSymptom(s: string) {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const selectedTank = tanks?.find((t) => t.id === tankId);

  async function handleSubmit() {
    const tankAgeDays = selectedTank?.startedOn
      ? String(Math.max(0, Math.round((Date.now() - new Date(selectedTank.startedOn).getTime()) / 86400000)))
      : "unknown";
    if (selectedSymptoms.size === 0) {
      setError(t.emergencyPage.pickSymptom);
      return;
    }
    setStage("loading");
    setError(null);
    try {
      const description = `Symptoms: ${Array.from(selectedSymptoms).join(", ")}.`;
      const result = await runTriage({
        photo: photo ?? undefined,
        description,
        affectedCount: affected,
        duration,
        recentTest: waterTest,
        tankAgeDays,
        tankId: tankId || undefined,
        locale,
      });

      if (!result.ok) {
        setError(result.error);
        setStage("error");
        return;
      }
      const parsed = TriageZod.safeParse(result.data.triage);
      if (!parsed.success) {
        setError(t.emergencyPage.unexpectedShape);
        setStage("error");
        return;
      }
      setBaseDescription(description);
      setFollowUpAnswers({});
      setReport(parsed.data);
      setStage("result");

      if (tankId) {
        await addLogEntry({
          tankId,
          type: "incident",
          body: `Emergency triage: ${description} First action: ${parsed.data.first_action}`,
        });
        setSavedIncident(true);
      }
    } catch {
      setError(t.emergencyPage.couldNotReachServer);
      setStage("error");
    }
  }

  // Re-runs triage with the report's own clarifying_questions answered —
  // previously there was no way to actually respond to "What I need to
  // know," so the report was a dead end the moment it asked something.
  async function handleFollowUpSubmit() {
    const answered = Object.entries(followUpAnswers).filter(([, a]) => a.trim());
    if (answered.length === 0) return;
    const tankAgeDays = selectedTank?.startedOn
      ? String(Math.max(0, Math.round((Date.now() - new Date(selectedTank.startedOn).getTime()) / 86400000)))
      : "unknown";
    setSubmittingFollowUp(true);
    setError(null);
    try {
      const description = `${baseDescription}\n\nFollow-up information:\n${answered.map(([q, a]) => `${q} ${a.trim()}`).join("\n")}`;
      const result = await runTriage({
        photo: photo ?? undefined,
        description,
        affectedCount: affected,
        duration,
        recentTest: waterTest,
        tankAgeDays,
        tankId: tankId || undefined,
        locale,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const parsed = TriageZod.safeParse(result.data.triage);
      if (!parsed.success) {
        setError(t.emergencyPage.unexpectedShape);
        return;
      }
      setBaseDescription(description);
      setFollowUpAnswers({});
      setReport(parsed.data);
    } catch {
      setError(t.emergencyPage.couldNotReachServer);
    } finally {
      setSubmittingFollowUp(false);
    }
  }

  if (stage === "result" && report) {
    // Redesigned 2026-09-15 around decision-usefulness (Jaideep's Fish
    // Doctor brief): action before diagnosis, and escalation moved above
    // the fold for high/critical urgency instead of sitting wherever it
    // happened to fall. `first_action` is no longer its own card — the
    // prompt requires it to equal immediate_actions[0].action, so showing
    // both used to duplicate the same line.
    const urgencyColor =
      report.urgency === "critical" || report.urgency === "high"
        ? "var(--color-fix-now)"
        : report.urgency === "moderate"
          ? "var(--color-watch)"
          : "var(--color-improve)";
    const escalationSection = (report.escalate.needed || report.escalation_triggers.length > 0) && (
      <>
        {report.escalate.needed && (
          <div style={{ marginBottom: 16 }}>
            <Banner severity="fixNow">
              {report.escalate.reason}
              {report.escalate.human_health_warning ? ` ${report.escalate.human_health_warning}` : ""}
            </Banner>
          </div>
        )}
        {report.escalation_triggers.length > 0 && (
          <Card style={{ marginBottom: 16, borderLeft: "4px solid var(--color-fix-now)" }}>
            <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-fix-now)" }}>{t.emergencyPage.getHelpUrgentlyIf}</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {report.escalation_triggers.map((trig) => (
                <li key={trig} style={{ marginBottom: 4 }}>
                  {trig}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </>
    );
    const isUrgent = report.urgency === "high" || report.urgency === "critical";

    return (
      <Screen>
        <BackHeader title={t.emergencyPage.resultTitle} fallbackHref="/" />

        <Card style={{ marginBottom: 16, borderLeft: `4px solid ${urgencyColor}` }}>
          <p style={{ fontSize: "var(--font-heading-size)", fontWeight: 700, marginBottom: 4 }}>{report.headline}</p>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 10 }}>{report.summary}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "var(--font-caption-size)" }}>
            <span>
              <span style={{ color: "var(--color-ink-muted)" }}>{t.emergencyPage.urgencyLabel}: </span>
              <strong style={{ color: urgencyColor }}>{t.emergencyPage.urgency[report.urgency]}</strong>
            </span>
            <span>
              <span style={{ color: "var(--color-ink-muted)" }}>{t.emergencyPage.diagnosisConfidenceLabel}: </span>
              <strong>{t.emergencyPage.confidenceLevel[report.confidence.diagnosis]}</strong>
            </span>
            <span>
              <span style={{ color: "var(--color-ink-muted)" }}>{t.emergencyPage.actionConfidenceLabel}: </span>
              <strong>{t.emergencyPage.confidenceLevel[report.confidence.actionability]}</strong>
            </span>
          </div>
        </Card>

        {isUrgent && escalationSection}

        {/* A loud but visually distinct warning from real escalation above —
            this used to share the exact same red "fixNow" banner as an
            active emergency, so an ungrounded-medication disclaimer read as
            equally alarming as "your fish may be dying." Amber instead. */}
        {report.medical_disclaimer && (
          <div style={{ marginBottom: 16 }}>
            <Banner severity="watch">{t.emergencyPage.medicalDisclaimer}</Banner>
          </div>
        )}

        {report.immediate_actions.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>{t.emergencyPage.immediateActions}</p>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {report.immediate_actions
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((a) => (
                  <li key={a.order} style={{ marginBottom: 8 }}>
                    <strong>{a.action}</strong>
                    <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{a.why}</p>
                    {a.caution && (
                      <p style={{ color: "var(--color-watch)", fontSize: "var(--font-body-sm-size)" }}>⚠ {a.caution}</p>
                    )}
                  </li>
                ))}
            </ol>
          </Card>
        )}

        {report.do_not.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-fix-now)" }}>{t.emergencyPage.doNot}</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {report.do_not.map((d) => (
                <li key={d} style={{ marginBottom: 4 }}>
                  {d}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.hypotheses.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.whatThisMightBe}</p>
            {report.hypotheses.map((h) => (
              <div key={h.id} style={{ marginBottom: 8 }}>
                <p>
                  <strong>{h.name}</strong> — {h.likelihood}
                </p>
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{h.reasoning}</p>
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{t.emergencyPage.confirmBy} {h.confirm_by}</p>
              </div>
            ))}
          </Card>
        )}

        {report.monitor_for.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.watchFor}</p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: "var(--font-body-sm-size)" }}>
              {report.monitor_for.map((m) => (
                <li key={m} style={{ marginBottom: 4 }}>
                  {m}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {!isUrgent && escalationSection}

        {report.conditional_guidance.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.ifThen}</p>
            {report.conditional_guidance.map((c, i) => (
              <p key={i} style={{ marginBottom: 8, fontSize: "var(--font-body-sm-size)" }}>
                <strong>{t.emergencyPage.if}</strong> {c.if} → {c.then}
              </p>
            ))}
          </Card>
        )}

        {report.clarifying_questions.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.worthChecking}</p>
            {report.clarifying_questions.map((q, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 4 }}>
                  {q.question} <span style={{ fontStyle: "italic" }}>({q.why})</span>
                </p>
                <Field
                  label=""
                  value={followUpAnswers[q.question] ?? ""}
                  onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [q.question]: e.target.value }))}
                  placeholder={t.emergencyPage.yourAnswer}
                />
              </div>
            ))}
            <SecondaryButton
              onClick={handleFollowUpSubmit}
              disabled={submittingFollowUp || Object.values(followUpAnswers).every((a) => !a.trim())}
            >
              {submittingFollowUp ? t.emergencyPage.gettingHelp : t.emergencyPage.getUpdatedAdvice}
            </SecondaryButton>
          </Card>
        )}

        {savedIncident && (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", textAlign: "center", marginBottom: 16 }}>
            {t.emergencyPage.savedToJournal}
          </p>
        )}

        <SecondaryButton
          onClick={() => {
            setStage("intake");
            setReport(null);
            setSelectedSymptoms(new Set());
            setPhoto(null);
            setSavedIncident(false);
          }}
        >
          {t.emergencyPage.startNewTriage}
        </SecondaryButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title={t.emergencyPage.title} fallbackHref="/" />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
        {t.emergencyPage.intro}
      </p>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.whatsHappening}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SYMPTOMS.map((s) => {
            const active = selectedSymptoms.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--color-fix-now)" : "var(--color-line)"}`,
                  background: active ? "var(--color-fix-now)" : "transparent",
                  color: active ? "#fff" : "var(--color-ink)",
                  fontSize: "var(--font-body-sm-size)",
                }}
              >
                {active ? "✓ " : ""}
                {s}
              </button>
            );
          })}
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{t.emergencyPage.howManyAffected}</p>
        <select value={affected} onChange={(e) => setAffected(e.target.value)} style={{ padding: 8, width: "100%", marginBottom: 12 }}>
          {AFFECTED_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <p style={{ fontWeight: 600, marginBottom: 4 }}>{t.emergencyPage.howLong}</p>
        <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ padding: 8, width: "100%", marginBottom: 12 }}>
          {DURATION_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <p style={{ fontWeight: 600, marginBottom: 4 }}>{t.emergencyPage.mostRecentTest}</p>
        <select value={waterTest} onChange={(e) => setWaterTest(e.target.value)} style={{ padding: 8, width: "100%" }}>
          {WATER_TEST_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{t.emergencyPage.whichTank}</p>
        <select value={tankId} onChange={(e) => setTankId(e.target.value)} style={{ padding: 8, width: "100%" }}>
          <option value="">{t.emergencyPage.noTankSkip}</option>
          {(tanks ?? []).map((tank) => (
            <option key={tank.id} value={tank.id}>
              {tank.name}
            </option>
          ))}
        </select>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.photoOptional}</p>
        <PhotoPickerButton label={photo ? t.emergencyPage.photoAttached : t.emergencyPage.addPhoto} onPick={setPhoto} />
      </Card>

      {error && (
        <div style={{ marginBottom: 16 }}>
          {error.includes("Couldn't reach the server") ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface-alt)", borderLeft: "3px solid var(--color-watch)" }}>
              <LottiePlayer name="offline" size={40} />
              <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)" }}>{error}</p>
            </div>
          ) : (
            <Banner severity="fixNow">{error}</Banner>
          )}
        </div>
      )}

      {stage === "loading" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <LottiePlayer name="triage" size={56} />
        </div>
      )}

      <PrimaryButton onClick={handleSubmit} disabled={stage === "loading"}>
        {stage === "loading" ? t.emergencyPage.gettingHelp : t.emergencyPage.getHelpNow}
      </PrimaryButton>
    </Screen>
  );
}
