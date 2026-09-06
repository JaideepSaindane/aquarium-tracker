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
import { createTask } from "@/db/queries/tasks";
import { runTriage } from "@/lib/ai-client";
import { syncReminder } from "@/lib/push-client";
import { presetRrule } from "@/lib/reminder-presets";
import { TriageZod, type TriageReport } from "@/server/ai/schemas/triage";

const SYMPTOMS = [
  "Spots",
  "Fuzzy patches",
  "Clamped fins",
  "Gasping at surface",
  "Lying on bottom",
  "Not eating",
  "Sudden deaths",
  "Cloudy water",
  "Other",
];

const AFFECTED_OPTIONS = ["Just one", "A few", "Most", "All"];
const DURATION_OPTIONS = ["Under an hour", "A few hours", "About a day", "Several days", "Not sure"];
const WATER_TEST_OPTIONS = ["Tested recently, results look fine", "Tested recently, something's off", "Haven't tested"];

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

type Stage = "intake" | "loading" | "result" | "error";

export default function EmergencyPage() {
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
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

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
      setError("Pick at least one symptom.");
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
      });

      if (!result.ok) {
        setError(result.error);
        setStage("error");
        return;
      }
      const parsed = TriageZod.safeParse(result.data.triage);
      if (!parsed.success) {
        setError("The response came back in an unexpected shape. Please try again.");
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
      setError("Couldn't reach the server. Please try again.");
      setStage("error");
    }
  }

  async function handleAddFollowUp(label: string, presetType: string, intervalDays: number) {
    if (!tankId || !selectedTank) return;
    const nextDueAt = daysFromNow(intervalDays);
    const rrule = presetRrule(intervalDays);
    const taskId = await createTask({ tankId, title: label, presetType, rrule, nextDueAt });
    await syncReminder({ taskId, title: label, tankId, tankName: selectedTank.name, dueAt: nextDueAt, rrule });
    setReminderMessage(`Reminder set: ${label}`);
  }

  if (stage === "result" && report) {
    return (
      <Screen>
        <BackHeader title="What to do" fallbackHref="/" />

        <Card style={{ marginBottom: 16, borderLeft: "4px solid var(--color-fix-now)" }}>
          <p style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)", marginBottom: 4 }}>DO THIS FIRST</p>
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

        {report.do_not.length > 0 && (
          <Card style={{ marginBottom: 16, borderLeft: "4px solid var(--color-fix-now)" }}>
            <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-fix-now)" }}>Do NOT</p>
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
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Immediate actions</p>
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
            <p style={{ fontWeight: 600, marginBottom: 8 }}>What this might be</p>
            {report.hypotheses.map((h) => (
              <div key={h.id} style={{ marginBottom: 8 }}>
                <p>
                  <strong>{h.name}</strong> — {h.likelihood}
                </p>
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{h.reasoning}</p>
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>Confirm by: {h.confirm_by}</p>
              </div>
            ))}
          </Card>
        )}

        {report.conditional_guidance.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>If / then</p>
            {report.conditional_guidance.map((c, i) => (
              <p key={i} style={{ marginBottom: 8, fontSize: "var(--font-body-sm-size)" }}>
                <strong>If</strong> {c.if} <strong>then</strong> {c.then}
              </p>
            ))}
          </Card>
        )}

        {report.could_not_determine.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Couldn&apos;t tell for sure</p>
            <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
              {report.could_not_determine.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </Card>
        )}

        {report.clarifying_questions.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Worth checking</p>
            {report.clarifying_questions.map((q, i) => (
              <p key={i} style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 4 }}>
                {q.question} <span style={{ fontStyle: "italic" }}>({q.why})</span>
              </p>
            ))}
          </Card>
        )}

        {tankId && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Follow-up reminders</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SecondaryButton onClick={() => handleAddFollowUp("Retest water", "test", 1)}>Retest in ~12–24 hours</SecondaryButton>
              <SecondaryButton onClick={() => handleAddFollowUp("Follow-up water change", "water_change", 1)}>
                Water change tomorrow
              </SecondaryButton>
            </div>
            {reminderMessage && (
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 8 }}>{reminderMessage}</p>
            )}
          </Card>
        )}

        {savedIncident && (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", textAlign: "center", marginBottom: 16 }}>
            Saved to this tank&apos;s journal.
          </p>
        )}

        <SecondaryButton
          onClick={() => {
            setStage("intake");
            setReport(null);
            setSelectedSymptoms(new Set());
            setPhoto(null);
            setSavedIncident(false);
            setReminderMessage(null);
          }}
        >
          Start a new triage
        </SecondaryButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="Emergency" fallbackHref="/" />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
        Free, always. Answer a few quick taps and we&apos;ll get you to the right first action.
      </p>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>What&apos;s happening? (pick all that apply)</p>
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
        <p style={{ fontWeight: 600, marginBottom: 4 }}>How many affected?</p>
        <select value={affected} onChange={(e) => setAffected(e.target.value)} style={{ padding: 8, width: "100%", marginBottom: 12 }}>
          {AFFECTED_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <p style={{ fontWeight: 600, marginBottom: 4 }}>How long has this been going on?</p>
        <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ padding: 8, width: "100%", marginBottom: 12 }}>
          {DURATION_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <p style={{ fontWeight: 600, marginBottom: 4 }}>Most recent water test</p>
        <select value={waterTest} onChange={(e) => setWaterTest(e.target.value)} style={{ padding: 8, width: "100%" }}>
          {WATER_TEST_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Which tank? (optional)</p>
        <select value={tankId} onChange={(e) => setTankId(e.target.value)} style={{ padding: 8, width: "100%" }}>
          <option value="">No tank set up / skip</option>
          {(tanks ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Photo (optional)</p>
        <PhotoPickerButton label={photo ? "Photo attached ✓" : "📷 Add a photo"} onPick={setPhoto} />
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
        {stage === "loading" ? "Getting help..." : "Get help now"}
      </PrimaryButton>
    </Screen>
  );
}
