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
import { LottiePlayer } from "@/components/LottiePlayer";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";
import { createScan } from "@/db/queries/scans";
import { addLogEntry } from "@/db/queries/log-entries";
import { addPhoto } from "@/db/queries/photos";
import { buildTankContext } from "@/lib/tank-context";
import { scanTank } from "@/lib/ai-client";
import { assessPhotoQuality, downscaleForUpload } from "@/lib/image-quality/browser";
import { ISSUE_MESSAGES, type QualityReport } from "@/lib/image-quality/algorithm";
import { readPhotoFile } from "@/lib/opfs-files";
import { uploadPhoto } from "@/lib/photo-upload";
import { isRemotePhotoUrl } from "@/lib/use-photo-src";
import { TankScanZod, type TankScanReport } from "@/server/ai/schemas/tank-scan";
import type { SeverityLevel } from "@/theme/tokens";

const SEVERITY_ORDER: SeverityLevel[] = ["fixNow", "watch", "improve"];
const SEVERITY_KEY: Record<string, SeverityLevel> = { fix_now: "fixNow", watch: "watch", improve: "improve" };
const QUESTION_THRESHOLD = 0.35;
const NEVER_PHOTO_ANSWERABLE = /\bph\b|ammonia|nitrite|nitrate|water parameter|temperature/i;

type Stage = "idle" | "checking" | "rejected" | "scanning" | "scan-error" | "report" | "saving" | "saved";

/**
 * "Health Check" (re-runs from the tank page) / "Scan your tank" (the
 * first one, offered right after creating a tank) — a re-runnable,
 * data-aware version of the onboarding Tank Scan (Jaideep's ask,
 * 2026-09-04: make tank analysis ongoing and smarter, not a one-time
 * onboarding thing; renamed/reframed 2026-09-11 — the first one is a
 * distinct invite, everything after it is a "health check"). Sends the
 * tank's own current record (equipment/livestock/parameters/log entries,
 * via buildTankContext) along with the photo, so findings can reference
 * what's actually logged instead of only ever reasoning from the bare
 * image — see tank-scan/v2.
 *
 * When arriving straight from tank creation (`fromCreate=1`) and a tank
 * photo was already uploaded during that flow, this reuses that exact
 * photo instead of asking for a second one (2026-09-11, Jaideep: "I have
 * already added that picture in my tank's profile so use that") — falls
 * back to asking for a fresh photo only if the stored one turns out to
 * fail the same quality gate every photo goes through, or if there was no
 * tank photo to begin with.
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
  const [reusedExistingPhoto, setReusedExistingPhoto] = useState(false);
  const [existingPhotoIssue, setExistingPhotoIssue] = useState<string | null>(null);
  const [existingPhotoRuledOut, setExistingPhotoRuledOut] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const hasExistingPhoto = fromCreate && !!tank?.photoUri && !existingPhotoRuledOut;

  async function scanExistingPhoto(photoUri: string) {
    setReusedExistingPhoto(true);
    setStage("checking");
    // The tank's own photo is a real https Blob URL for anything created
    // since the 2026-09-11 photo-storage migration — fetch its bytes
    // directly; a legacy OPFS-relative path (older tanks) still reads from
    // local browser storage the old way.
    const blob = isRemotePhotoUrl(photoUri) ? await fetch(photoUri).then((r) => (r.ok ? r.blob() : null)) : await readPhotoFile(photoUri);
    if (!blob) {
      // Shouldn't normally happen, but don't strand the user — fall back
      // to the ordinary ask-for-a-photo path.
      setReusedExistingPhoto(false);
      setStage("idle");
      return;
    }
    const file = new File([blob], "tank-photo.jpg", { type: blob.type || "image/jpeg" });
    await handleFile(file, photoUri);
  }

  async function handleFile(file: File, reusePath?: string) {
    setStage("checking");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    const quality = await assessPhotoQuality(file);
    setQualityReport(quality);
    if (!quality.usable) {
      // The tank's already-uploaded photo turned out not to pass the same
      // quality bar a fresh capture would — don't get stuck reusing a
      // photo that can't be scanned; fall back to asking for a new one,
      // with an honest reason instead of silently switching modes.
      if (reusePath) {
        setReusedExistingPhoto(false);
        setExistingPhotoRuledOut(true);
        setExistingPhotoIssue(quality.issues[0] ? ISSUE_MESSAGES[quality.issues[0]] : "That photo wasn't clear enough for a scan.");
        setStage("idle");
        return;
      }
      setStage("rejected");
      return;
    }

    const blob = await downscaleForUpload(file);
    // Reusing the tank's own setup photo (it's already stored, and already
    // has a Gallery entry from tank creation, so there's no new upload and
    // handleSave skips adding a duplicate one) vs. a genuinely new capture,
    // which uploads to Vercel Blob (2026-09-11) so the photo follows the
    // account, not just this device.
    const path = reusePath ?? (await uploadPhoto(file));
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
    setReusedExistingPhoto(false);
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
    const label = fromCreate ? "Tank Scan" : "Health Check";
    const entryId = await addLogEntry({ tankId: id, type: "journal", body: `${label}: ${findingSummary}` });
    // Reusing the tank's own setup photo already has a Gallery entry from
    // tank creation — don't add the same file to the Gallery twice.
    if (!reusedExistingPhoto) await addPhoto({ tankId: id, logEntryId: entryId, localUri: originalPath });
    setStage("saved");
  }

  if (!tank) return <Screen>Loading...</Screen>;

  const backTarget = `/tank/${id}`;
  const screenTitle = fromCreate ? "Scan your tank" : "Health Check";

  if (stage === "saved") {
    return (
      <Screen>
        <BackHeader title={screenTitle} fallbackHref={backTarget} />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LottiePlayer name="success" loop={false} size={100} respectReducedMotion />
        </div>
        <Banner severity="improve">Saved to your Journal.</Banner>
        <div style={{ height: 12 }} />
        {/* replace, not push — this is a finished/terminal screen, so the
            browser back button shouldn't be able to return into it (Jaideep
            hit this: "back" from the tank page landed back on this saved
            Check screen instead of skipping past it). */}
        <PrimaryButton onClick={() => router.replace(`/tank/${id}`)}>Back to my tank</PrimaryButton>
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
        <BackHeader title={fromCreate ? "Your tank scan" : "Health Check results"} fallbackHref={backTarget} />

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

      <BackHeader title={screenTitle} fallbackHref={backTarget} />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
        {fromCreate
          ? hasExistingPhoto
            ? "Let us scan your tank and give you some advice — we'll use the photo you already added. Optional, you can always do this later."
            : "Let us scan your tank and give you some advice. Optional — you can always do this later."
          : `A health check for ${tank.name}, using what's already logged plus a new photo.`}
      </p>

      {stage === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {existingPhotoIssue && (
            <Banner severity="watch">{existingPhotoIssue} Take a new one instead.</Banner>
          )}
          {hasExistingPhoto ? (
            <PrimaryButton onClick={() => void scanExistingPhoto(tank.photoUri!)}>🔍 Scan my tank</PrimaryButton>
          ) : (
            <>
              <PrimaryButton onClick={() => cameraInputRef.current?.click()}>📷 Take a photo</PrimaryButton>
              <SecondaryButton onClick={() => libraryInputRef.current?.click()}>Choose from library</SecondaryButton>
            </>
          )}
          {fromCreate && <SecondaryButton onClick={() => router.replace(`/tank/${id}`)}>Skip for now</SecondaryButton>}
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <LottiePlayer name="scanning" size={72} />
            <p>Analysing your tank...</p>
          </div>
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
          {scanError?.includes("Couldn't reach the server") ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface-alt)", borderLeft: "3px solid var(--color-watch)" }}>
              <LottiePlayer name="offline" size={40} />
              <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)" }}>{scanError}</p>
            </div>
          ) : (
            <Banner severity="fixNow">{scanError}</Banner>
          )}
          <div style={{ height: 8 }} />
          <PrimaryButton onClick={() => uploadBlob && runScan(uploadBlob)}>Try again</PrimaryButton>
          <div style={{ height: 8 }} />
          <SecondaryButton onClick={retake}>Retake photo</SecondaryButton>
        </div>
      )}
    </Screen>
  );
}
