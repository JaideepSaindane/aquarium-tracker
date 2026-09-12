"use client";

import { useState } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
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

  if (stage === "result" && report) {
    return (
      <Screen>
        <BackHeader title={t.emergencyPage.resultTitle} fallbackHref="/" />

        <Card style={{ marginBottom: 16, borderLeft: "4px solid var(--color-fix-now)" }}>
          <p style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 4 }}>{t.emergencyPage.doThisFirst}</p>
          <p style={{ fontSize: "var(--font-heading-size)", fontWeight: 700 }}>{report.first_action}</p>
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
            <Banner severity="fixNow">
              {t.emergencyPage.medicalDisclaimer}
            </Banner>
          </div>
        )}

        {report.do_not.length > 0 && (
          <Card style={{ marginBottom: 16, borderLeft: "4px solid var(--color-fix-now)" }}>
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

        {report.immediate_actions.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.immediateActions}</p>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {report.immediate_actions
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

        {report.conditional_guidance.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.ifThen}</p>
            {report.conditional_guidance.map((c, i) => (
              <p key={i} style={{ marginBottom: 8, fontSize: "var(--font-body-sm-size)" }}>
                <strong>{t.emergencyPage.if}</strong> {c.if} <strong>{t.emergencyPage.then}</strong> {c.then}
              </p>
            ))}
          </Card>
        )}

        {report.could_not_determine.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.couldNotTell}</p>
            <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
              {report.could_not_determine.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </Card>
        )}

        {report.clarifying_questions.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.emergencyPage.worthChecking}</p>
            {report.clarifying_questions.map((q, i) => (
              <p key={i} style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 4 }}>
                {q.question} <span style={{ fontStyle: "italic" }}>({q.why})</span>
              </p>
            ))}
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
