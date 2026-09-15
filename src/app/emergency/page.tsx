"use client";

import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { PrimaryButton } from "@/components/Button";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { LottiePlayer } from "@/components/LottiePlayer";
import { useLiveQuery } from "@/db/live";
import { listTanks } from "@/db/queries/tanks";
import { addLogEntry } from "@/db/queries/log-entries";
import { runTriage } from "@/lib/ai-client";
import { TriageZod, type TriageReport } from "@/server/ai/schemas/triage";
import { useLocale } from "@/i18n/use-locale";
import { useTranslation } from "@/i18n/use-translation";
import { useRouter } from "next/navigation";
import { useCommunityDraft } from "@/store/use-community-draft";
import { setAskHandoff } from "@/store/use-ask-handoff";

type Stage = "intake" | "loading" | "result" | "error";

const TRIAGE_RETURN_KEY = "aquaai-triage-return";

export default function EmergencyPage() {
  const { locale } = useLocale();
  const t = useTranslation();
  const router = useRouter();
  const setCommunityDraft = useCommunityDraft((s) => s.setDraft);
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
  const [fishNames, setFishNames] = useState("");
  const [otherSymptom, setOtherSymptom] = useState("");
  const [report, setReport] = useState<TriageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIncident, setSavedIncident] = useState(false);
  const [baseDescription, setBaseDescription] = useState("");

  // Returning via Back from "Post on community" used to remount this page on
  // an empty form, losing the report. The report is stashed right before that
  // hand-off and restored once on return.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TRIAGE_RETURN_KEY);
      if (!raw) return;
      sessionStorage.removeItem(TRIAGE_RETURN_KEY);
      const saved = JSON.parse(raw);
      const parsed = TriageZod.safeParse(saved.report);
      if (!parsed.success) return;
      /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from sessionStorage on mount */
      setSelectedSymptoms(new Set(saved.symptoms ?? []));
      setAffected(saved.affected);
      setDuration(saved.duration);
      setWaterTest(saved.waterTest);
      setFishNames(saved.fishNames ?? "");
      setOtherSymptom(saved.otherSymptom ?? "");
      setBaseDescription(saved.baseDescription ?? "");
      setReport(parsed.data);
      setStage("result");
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {}
  }, []);

  function toggleSymptom(s: string) {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const selectedTank = tanks?.find((t) => t.id === tankId);
  // "Other" is replaced by what the user typed, when they typed something.
  const symptomsText = Array.from(selectedSymptoms)
    .map((sym) => (sym === t.emergencyPage.symptoms.other && otherSymptom.trim() ? otherSymptom.trim() : sym))
    .join(", ");

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
      const description = `Symptoms: ${symptomsText}.${fishNames.trim() ? ` Fish affected: ${fishNames.trim()}.` : ""}`;
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

  // Stash the report so Back from Ask/Community restores it instead of an empty form.
  function stashForReturn() {
    try {
      sessionStorage.setItem(
        TRIAGE_RETURN_KEY,
        JSON.stringify({ report, symptoms: Array.from(selectedSymptoms), affected, duration, waterTest, fishNames, otherSymptom, baseDescription })
      );
    } catch {}
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
    // Trimmed 2026-09-15 (Jaideep: the page was too long, and avoid / watch
    // for / get help / next-step read as boring extra info). Visible: the
    // analysis summary (likely cause woven in) and "Do this now". Everything
    // else sits under a collapsed "More tips". An active escalation (this
    // case needs a vet / is dangerous now) still shows up top, never hidden.
    const miniHeading = { fontWeight: 700, fontSize: "var(--font-body-sm-size)", margin: "14px 0 6px" } as const;
    const miniList = { margin: 0, paddingLeft: 20, fontSize: "var(--font-body-sm-size)", display: "flex", flexDirection: "column", gap: 4 } as const;

    return (
      <Screen>
        <BackHeader title={t.emergencyPage.resultTitle} fallbackHref="/" />

        <Card style={{ marginBottom: 16, borderLeft: `4px solid ${urgencyColor}` }}>
          <p style={{ fontSize: "var(--font-heading-size)", fontWeight: 700, marginBottom: 6 }}>{report.headline}</p>
          <p style={{ fontSize: "var(--font-body-sm-size)", lineHeight: 1.5, marginBottom: 8 }}>{report.summary}</p>
          <p style={{ fontSize: "var(--font-caption-size)", margin: 0 }}>
            <span style={{ color: "var(--color-ink-muted)" }}>{t.emergencyPage.urgencyLabel}: </span>
            <strong style={{ color: urgencyColor }}>{t.emergencyPage.urgency[report.urgency]}</strong>
          </p>
        </Card>

        {report.escalate.needed && (
          <div style={{ marginBottom: 16 }}>
            <Banner severity="fixNow">
              {report.escalate.reason}
              {report.escalate.human_health_warning ? ` ${report.escalate.human_health_warning}` : ""}
            </Banner>
          </div>
        )}

        {report.medical_disclaimer && (
          <div style={{ marginBottom: 16 }}>
            <Banner severity="watch">{t.emergencyPage.medicalDisclaimer}</Banner>
          </div>
        )}

        {report.immediate_actions.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>{t.emergencyPage.immediateActions}</p>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {report.immediate_actions
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((a) => (
                  <li key={a.order} style={{ lineHeight: 1.45 }}>
                    <strong>{a.action}</strong>
                    {a.why && <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}> — {a.why}</span>}
                    {a.caution && !/^(none|n\/a|null|-)\.?$/i.test(a.caution.trim()) && (
                      <p style={{ color: "var(--color-watch)", fontSize: "var(--font-body-sm-size)", margin: "2px 0 0" }}>⚠ {a.caution}</p>
                    )}
                  </li>
                ))}
            </ol>
          </Card>
        )}

        {(report.do_not.length > 0 ||
          report.hypotheses.length > 0 ||
          report.monitor_for.length > 0 ||
          report.escalation_triggers.length > 0 ||
          report.conditional_guidance.length > 0) && (
          <Card style={{ marginBottom: 16 }}>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>{t.emergencyPage.moreTips}</summary>

              {report.do_not.length > 0 && (
                <>
                  <p style={miniHeading}>{t.emergencyPage.doNot}</p>
                  <ul style={miniList}>
                    {report.do_not.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </>
              )}

              {report.hypotheses.length > 0 && (
                <>
                  <p style={miniHeading}>{t.emergencyPage.whatThisMightBe}</p>
                  <ul style={miniList}>
                    {report.hypotheses.map((h) => (
                      <li key={h.id}>
                        <strong>{h.name}</strong> — {h.reasoning}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {report.monitor_for.length > 0 && (
                <>
                  <p style={miniHeading}>{t.emergencyPage.watchFor}</p>
                  <ul style={miniList}>
                    {report.monitor_for.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </>
              )}

              {report.escalation_triggers.length > 0 && (
                <>
                  <p style={miniHeading}>{t.emergencyPage.getHelpUrgentlyIf}</p>
                  <ul style={miniList}>
                    {report.escalation_triggers.map((trig) => (
                      <li key={trig}>{trig}</li>
                    ))}
                  </ul>
                </>
              )}

              {report.conditional_guidance.length > 0 && (
                <>
                  <p style={miniHeading}>{t.emergencyPage.ifThen}</p>
                  <ul style={miniList}>
                    {report.conditional_guidance.map((c, i) => (
                      <li key={i}>
                        {c.if} → {c.then}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </details>
          </Card>
        )}

        {savedIncident && (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", textAlign: "center", marginBottom: 16 }}>
            {t.emergencyPage.savedToJournal}
          </p>
        )}

        <Card style={{ marginBottom: 12, textAlign: "center" }}>
          <p style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-ink-muted)", marginBottom: 8 }}>
            {t.emergencyPage.moreQuestions}
          </p>
          <PrimaryButton
            onClick={() => {
              // Replaces the old inline follow-up fields: the whole session is
              // compressed into hidden context for Ask AquaAI, where the user
              // just keeps chatting. The report's own open questions go along
              // so AquaAI can ask them.
              const lines = [
                "FISH DOCTOR SESSION (the user came from an emergency triage; continue helping with this case):",
                fishNames.trim() && `Fish: ${fishNames.trim()}`,
                `Symptoms: ${symptomsText}`,
                `Affected: ${affected}; for: ${duration}; water test: ${waterTest}`,
                `Assessment: ${report.headline} — ${report.summary} (urgency ${report.urgency})`,
                report.immediate_actions.length && `Advised now: ${report.immediate_actions.slice(0, 5).map((a) => a.action).join(" | ")}`,
                report.do_not.length && `Advised to avoid: ${report.do_not.slice(0, 5).join(" | ")}`,
                report.hypotheses.length && `Possible causes: ${report.hypotheses.map((h) => `${h.name} (${h.likelihood})`).join(", ")}`,
                report.clarifying_questions.length &&
                  `Still unknown — ask the user if relevant: ${report.clarifying_questions.map((q) => q.question).join(" | ")}`,
              ].filter(Boolean);
              setAskHandoff({ title: report.headline, context: lines.join("\n"), tankId: tankId || null });
              stashForReturn();
              router.push("/ask");
            }}
          >
            {t.emergencyPage.continueInAqua}
          </PrimaryButton>
        </Card>

        <Card style={{ marginBottom: 12, textAlign: "center" }}>
          <p style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-ink-muted)", marginBottom: 8 }}>
            {t.emergencyPage.notSatisfied}
          </p>
          <PrimaryButton
            onClick={() => {
              // Prefill a draft (symptoms + intake answers + photo) and open
              // New Post for review — not posted publicly without a tap.
              const body = t.emergencyPage.communityDraft
                .replace("{fish}", fishNames.trim() || "-")
                .replace("{symptoms}", symptomsText)
                .replace("{affected}", affected)
                .replace("{duration}", duration)
                .replace("{waterTest}", waterTest);
              setCommunityDraft(body, photo);
              stashForReturn();
              router.push("/community/new");
            }}
          >
            {t.emergencyPage.postOnCommunity}
          </PrimaryButton>
        </Card>

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
        {selectedSymptoms.has(t.emergencyPage.symptoms.other) && (
          <div style={{ marginTop: 12 }}>
            <Field
              label=""
              value={otherSymptom}
              onChange={(e) => setOtherSymptom(e.target.value)}
              placeholder={t.emergencyPage.otherSymptomPlaceholder}
              autoFocus
            />
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Field
          label={t.emergencyPage.fishNameLabel}
          value={fishNames}
          onChange={(e) => setFishNames(e.target.value)}
          placeholder={t.emergencyPage.fishNamePlaceholder}
        />
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
