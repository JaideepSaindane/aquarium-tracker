"use client";

import { use, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { SeverityCard } from "@/components/SeverityCard";
import { Confidence } from "@/components/Confidence";
import { GroundingLink } from "@/components/GroundingLink";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";
import { createScan } from "@/db/queries/scans";
import { addLogEntry } from "@/db/queries/log-entries";
import { addPhoto } from "@/db/queries/photos";
import { createTask } from "@/db/queries/tasks";
import { buildTankContext } from "@/lib/tank-context";
import { scanTank } from "@/lib/ai-client";
import { presetRrule, presetLabel } from "@/lib/reminder-presets";
import { syncReminder } from "@/lib/push-client";
import { assessPhotoQuality, downscaleForUpload } from "@/lib/image-quality/browser";
import { ISSUE_MESSAGES, type QualityReport } from "@/lib/image-quality/algorithm";
import { writePhotoFile } from "@/lib/opfs-files";
import { newId } from "@/db/id";
import { TankScanZod, type TankScanReport } from "@/server/ai/schemas/tank-scan";
import type { SeverityLevel } from "@/theme/tokens";

const SEVERITY_ORDER: SeverityLevel[] = ["fixNow", "watch", "improve"];
const SEVERITY_KEY: Record<string, SeverityLevel> = { fix_now: "fixNow", watch: "watch", improve: "improve" };
const QUESTION_THRESHOLD = 0.35;
const NEVER_PHOTO_ANSWERABLE = /\bph\b|ammonia|nitrite|nitrate|water parameter|temperature/i;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

type Stage = "idle" | "checking" | "rejected" | "scanning" | "scan-error" | "report" | "saving" | "saved";

/**
 * "Tank Check" — a re-runnable, data-aware version of the onboarding Tank
 * Scan (Jaideep's ask, 2026-09-04: make tank analysis ongoing and smarter,
 * not a one-time onboarding thing). Sends the tank's own current record
 * (equipment/livestock/parameters/log entries, via buildTankContext) along
 * with the photo, so findings can reference what's actually logged instead
 * of only ever reasoning from the bare image — see tank-scan/v2.
 */
export default function TankCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCreate = searchParams.get("fromCreate") === "1";
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);

  const [stage, setStage] = useState<Stage>("idle");
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadBlob, setUploadBlob] = useState<Blob | null>(null);
  const [originalPath, setOriginalPath] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [report, setReport] = useState<TankScanReport | null>(null);
  const [addedReminders, setAddedReminders] = useState<Set<number>>(new Set());

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStage("checking");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    const quality = await assessPhotoQuality(file);
    setQualityReport(quality);
    if (!quality.usable) {
      setStage("rejected");
      return;
    }

    const blob = await downscaleForUpload(file);
    const path = `captures/${newId()}-check.jpg`;
    await writePhotoFile(path, file);
    setUploadBlob(blob);
    setOriginalPath(path);
    await runScan(blob);
  }

  function retake() {
    setStage("idle");
    setQualityReport(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadBlob(null);
    setOriginalPath(null);
    setReport(null);
  }

  async function runScan(blob: Blob) {
    if (!tank) return;
    setStage("scanning");
    setScanError(null);
    try {
      const tankRecord = await buildTankContext(id);
      const photoFile = new File([blob], "upload.jpg", { type: "image/jpeg" });
      const result = await scanTank({
        photo: photoFile,
        lengthCm: tank.lengthCm,
        widthCm: tank.widthCm,
        heightCm: tank.heightCm,
        city: tank.city ?? "",
        tankId: id,
        tankRecord,
      });
      if (!result.ok) {
        setScanError(result.error);
        setStage("scan-error");
        return;
      }
      const parsed = TankScanZod.safeParse(result.data.report);
      if (!parsed.success) {
        setScanError("The check came back in an unexpected shape. Please try again.");
        setStage("scan-error");
        return;
      }
      setReport(parsed.data);
      setStage("report");
    } catch {
      setScanError("Couldn't reach the server. Try again when you're back online.");
      setStage("scan-error");
    }
  }

  async function handleSave() {
    if (!report || !originalPath) return;
    setStage("saving");
    await createScan({
      tankId: id,
      imageUri: originalPath,
      modelName: "unknown",
      promptVersion: report.prompt_version,
      rawResponse: report,
      findings: report.findings,
      scores: report.scores,
    });
    const findings = report.findings.filter((f) => f.confidence >= QUESTION_THRESHOLD);
    const findingSummary = findings.length > 0 ? findings.map((f) => f.title).join("; ") : "No issues flagged.";
    const entryId = await addLogEntry({ tankId: id, type: "journal", body: `Tank Check: ${findingSummary}` });
    await addPhoto({ tankId: id, logEntryId: entryId, localUri: originalPath });
    setStage("saved");
  }

  async function handleAddReminder(index: number) {
    if (!report || !tank) return;
    const rec = report.recommended_maintenance[index];
    const nextDueAt = daysFromNow(rec.interval_days);
    const title = presetLabel(rec.preset_type);
    const rrule = presetRrule(rec.interval_days);
    const taskId = await createTask({ tankId: id, title, presetType: rec.preset_type, rrule, nextDueAt });
    await syncReminder({ taskId, title, tankId: id, tankName: tank.name, dueAt: nextDueAt, rrule });
    setAddedReminders((prev) => new Set(prev).add(index));
  }

  if (!tank) return <Screen>Loading...</Screen>;

  const backTarget = `/tank/${id}`;

  if (stage === "saved") {
    return (
      <Screen>
        <BackHeader title="Tank Check" fallbackHref={backTarget} />
        <Banner severity="improve">Saved to your Journal.</Banner>
        <div style={{ height: 12 }} />
        <PrimaryButton onClick={() => router.push(`/tank/${id}`)}>Back to my tank</PrimaryButton>
      </Screen>
    );
  }

  if (stage === "report" && report) {
    const algae = report.algae.filter((a) => a.type.toLowerCase() !== "none");
    const findings = report.findings.filter((f) => f.confidence >= QUESTION_THRESHOLD);
    const uncertain = report.findings.filter((f) => f.confidence < QUESTION_THRESHOLD);
    const findingsBySeverity = SEVERITY_ORDER.map((level) => ({
      level,
      items: findings.filter((f) => SEVERITY_KEY[f.severity] === level),
    })).filter((g) => g.items.length > 0);
    const couldNotDetermine = report.could_not_determine.filter((item) => !NEVER_PHOTO_ANSWERABLE.test(item));

    return (
      <Screen
        footer={
          <>
            <PrimaryButton onClick={handleSave}>Save to Journal</PrimaryButton>
            <SecondaryButton onClick={retake}>Check again</SecondaryButton>
          </>
        }
      >
        <BackHeader title="Tank Check results" fallbackHref={backTarget} />

        {findings.length === 0 && findingsBySeverity.length === 0 && (
          <div style={{ marginBottom: 16 }}>
            <Banner severity="improve">Nothing to flag — your tank looks in good shape.</Banner>
          </div>
        )}

        {findingsBySeverity.map((group) => (
          <div key={group.level} style={{ marginBottom: 16 }}>
            {group.items.map((f) => (
              <div key={f.id} style={{ marginBottom: 8 }}>
                <SeverityCard severity={group.level} title={f.title}>
                  {f.explanation}
                </SeverityCard>
                {f.recommended_action && (
                  <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginTop: 4, marginLeft: 4 }}>
                    → {f.recommended_action}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4, marginLeft: 4 }}>
                  <Confidence value={f.confidence} />
                  {f.grounding_refs.map((ref) => {
                    const [type, gid] = ref.split(":");
                    return (
                      <GroundingLink
                        key={ref}
                        label={ref}
                        onOpen={type === "species" ? () => router.push(`/dex/${gid}`) : type === "corpus" ? () => router.push(`/corpus/${gid}`) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        {uncertain.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Not sure about these — worth a second look</p>
            {uncertain.map((f) => (
              <p key={f.id} style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>
                {f.title}?
              </p>
            ))}
          </Card>
        )}

        {report.recommended_maintenance.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Suggested reminders</p>
            {report.recommended_maintenance.map((rec, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>{presetLabel(rec.preset_type)}</p>
                  <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{rec.why}</p>
                </div>
                {addedReminders.has(i) ? (
                  <span style={{ color: "var(--color-improve)", fontSize: "var(--font-caption-size)", fontWeight: 600, flexShrink: 0 }}>Added ✓</span>
                ) : (
                  <SecondaryButton style={{ width: "auto", padding: "4px 12px", flexShrink: 0 }} onClick={() => handleAddReminder(i)}>
                    + Add
                  </SecondaryButton>
                )}
              </div>
            ))}
          </Card>
        )}

        {algae.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Algae spotted</p>
            {algae.map((a, i) => (
              <p key={i} style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
                {a.type} ({a.severity}) — {a.location}
              </p>
            ))}
          </Card>
        )}

        {couldNotDetermine.length > 0 && (
          <Card>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Couldn&apos;t tell from this photo</p>
            <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
              {couldNotDetermine.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <BackHeader title="Tank Check" fallbackHref={backTarget} />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
        {fromCreate
          ? "Optional — take a photo of your new tank for a quick AI check. You can always do this later."
          : `A fresh look at ${tank.name}, using what's already logged plus a new photo.`}
      </p>

      {stage === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PrimaryButton onClick={() => cameraInputRef.current?.click()}>📷 Take a photo</PrimaryButton>
          <SecondaryButton onClick={() => libraryInputRef.current?.click()}>Choose from library</SecondaryButton>
          {fromCreate && <SecondaryButton onClick={() => router.push(`/tank/${id}`)}>Skip for now</SecondaryButton>}
        </div>
      )}

      {stage === "checking" && (
        <Card>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URL preview
            <img src={previewUrl} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
          )}
          <p>Checking photo...</p>
        </Card>
      )}

      {stage === "scanning" && (
        <Card>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URL preview
            <img src={previewUrl} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
          )}
          <p>Analysing your tank...</p>
        </Card>
      )}

      {stage === "rejected" && qualityReport && (
        <div>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URL preview
            <img src={previewUrl} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />
          )}
          {qualityReport.issues.map((issue) => (
            <div key={issue} style={{ marginBottom: 8 }}>
              <Banner severity="watch">{ISSUE_MESSAGES[issue]}</Banner>
            </div>
          ))}
          <div style={{ height: 8 }} />
          <PrimaryButton onClick={retake}>Retake</PrimaryButton>
        </div>
      )}

      {stage === "scan-error" && (
        <div>
          <Banner severity="fixNow">{scanError}</Banner>
          <div style={{ height: 8 }} />
          <PrimaryButton onClick={() => uploadBlob && runScan(uploadBlob)}>Try again</PrimaryButton>
          <div style={{ height: 8 }} />
          <SecondaryButton onClick={retake}>Retake photo</SecondaryButton>
        </div>
      )}
    </Screen>
  );
}
