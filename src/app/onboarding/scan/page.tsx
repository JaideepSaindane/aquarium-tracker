"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { LottiePlayer } from "@/components/LottiePlayer";
import { assessPhotoQuality, downscaleForUpload } from "@/lib/image-quality/browser";
import { ISSUE_MESSAGES, type QualityReport } from "@/lib/image-quality/algorithm";
import { uploadPhoto } from "@/lib/photo-upload";
import { scanTank } from "@/lib/ai-client";
import { useScanSession } from "@/store/use-scan-session";
import { getProfile } from "@/db/queries/profile";
import { TankScanZod } from "@/server/ai/schemas/tank-scan";
import { COMMON_CITIES } from "@/lib/common-options";
import { convertDimension } from "@/lib/dimension-units";
import { useTranslation } from "@/i18n/use-translation";

type Stage = "idle" | "checking" | "rejected" | "details" | "scanning" | "scan-error";

export default function ScanCapturePage() {
  const router = useRouter();
  const t = useTranslation();
  const [stage, setStage] = useState<Stage>("idle");
  const [report, setReport] = useState<QualityReport | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadBlob, setUploadBlob] = useState<Blob | null>(null);
  const [originalPath, setOriginalPath] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanErrorOffline, setScanErrorOffline] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [unit, setUnit] = useState<"cm" | "ft">("cm");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [city, setCity] = useState("");

  function toggleUnit(next: "cm" | "ft") {
    if (next === unit) return;
    setLength((v) => convertDimension(v, unit, next));
    setWidth((v) => convertDimension(v, unit, next));
    setHeight((v) => convertDimension(v, unit, next));
    setUnit(next);
  }

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const setCapture = useScanSession((s) => s.setCapture);
  const setDimensions = useScanSession((s) => s.setDimensions);
  const setStoreReport = useScanSession((s) => s.setReport);
  const resetSession = useScanSession((s) => s.reset);

  useEffect(() => {
    // Reset here, on entry, rather than right before navigating away from
    // the report page — doing it there raced the report page's own
    // "no report, bounce back to scan" redirect. See that page's comment.
    resetSession();
    getProfile().then((p) => {
      if (p?.city) setCity(p.city);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lengthCm = length ? Number(convertDimension(length, unit, "cm")) : null;
  const widthCm = width ? Number(convertDimension(width, unit, "cm")) : null;
  const heightCm = height ? Number(convertDimension(height, unit, "cm")) : null;
  const volumeL = lengthCm && widthCm && heightCm ? Math.round(((lengthCm * widthCm * heightCm) / 1000) * 10) / 10 : null;

  async function handleFile(file: File) {
    setStage("checking");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    const quality = await assessPhotoQuality(file);
    setReport(quality);

    if (!quality.usable) {
      setStage("rejected");
      return;
    }

    // Save the full-resolution original now, before anything else — so a
    // failed or interrupted scan call never costs the user their photo
    // (specs/T-015 acceptance criterion 11). Uploads to Vercel Blob
    // (2026-09-11), not OPFS, since the tank this becomes needs to be
    // reachable from any device, not just this one — this does mean the
    // upload itself needs a network connection now, same as the AI scan
    // call right after it does anyway.
    const blob = await downscaleForUpload(file);
    let path: string;
    try {
      path = await uploadPhoto(file);
    } catch {
      setUploadError(t.scanPage.couldNotUploadPhoto);
      setStage("rejected");
      return;
    }
    setUploadBlob(blob);
    setOriginalPath(path);
    setStage("details");
  }

  function retake() {
    setStage("idle");
    setReport(null);
    setUploadError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadBlob(null);
    setOriginalPath(null);
  }

  async function runScan() {
    if (!uploadBlob || !originalPath) return;
    if (!lengthCm || !widthCm || !heightCm) return;
    setStage("scanning");
    setScanError(null);
    setScanErrorOffline(false);

    try {
      const photoFile = new File([uploadBlob], "upload.jpg", { type: "image/jpeg" });
      const result = await scanTank({
        photo: photoFile,
        lengthCm,
        widthCm,
        heightCm,
        city: city.trim(),
      });

      if (!result.ok) {
        setScanError(result.error);
        setStage("scan-error");
        return;
      }

      const parsed = TankScanZod.safeParse(result.data.report);
      if (!parsed.success) {
        setScanError(t.scanPage.unexpectedShape);
        setStage("scan-error");
        return;
      }

      setCapture({ originalPhotoPath: originalPath, uploadBlob });
      setDimensions({ lengthCm, widthCm, heightCm, city: city.trim() });
      setStoreReport(parsed.data, result.data.meta.provider);
      router.push("/onboarding/report");
    } catch {
      setScanError(t.scanPage.couldNotReachServer);
      setScanErrorOffline(true);
      setStage("scan-error");
    }
  }

  const footer =
    stage === "idle" ? (
      <>
        <PrimaryButton onClick={() => cameraInputRef.current?.click()}>{t.scanPage.takePhoto}</PrimaryButton>
        <SecondaryButton onClick={() => libraryInputRef.current?.click()}>{t.scanPage.chooseFromLibrary}</SecondaryButton>
      </>
    ) : stage === "rejected" ? (
      <PrimaryButton onClick={retake}>{t.scanPage.retake}</PrimaryButton>
    ) : stage === "details" || stage === "scanning" || stage === "scan-error" ? (
      <>
        <PrimaryButton onClick={runScan} disabled={stage === "scanning" || !lengthCm || !widthCm || !heightCm}>
          {stage === "scanning" ? t.scanPage.analysingYourTank : stage === "scan-error" ? t.scanPage.tryAgain : t.scanPage.scanMyTank}
        </PrimaryButton>
        <SecondaryButton onClick={retake} disabled={stage === "scanning"}>
          {t.scanPage.retakePhoto}
        </SecondaryButton>
      </>
    ) : null;

  return (
    <Screen footer={footer}>
      <BackHeader title={t.scanPage.title} fallbackHref="/" />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>
        {t.scanPage.standSquare}
      </p>

      {stage === "idle" && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          style={{ display: "none" }}
        />
      )}
      {stage === "idle" && (
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          style={{ display: "none" }}
        />
      )}

      {stage === "checking" && (
        <Card>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URL preview
            <img src={previewUrl} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
          )}
          <p>{t.scanPage.checkingPhoto}</p>
        </Card>
      )}

      {stage === "rejected" && (
        <div>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URL preview
            <img src={previewUrl} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />
          )}
          {uploadError && (
            <div style={{ marginBottom: 8 }}>
              <Banner severity="watch">{uploadError}</Banner>
            </div>
          )}
          {report?.issues.map((issue) => (
            <div key={issue} style={{ marginBottom: 8 }}>
              <Banner severity="watch">{ISSUE_MESSAGES[issue]}</Banner>
            </div>
          ))}
        </div>
      )}

      {(stage === "details" || stage === "scanning" || stage === "scan-error") && (
        <div>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URL preview
            <img src={previewUrl} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />
          )}
          <Card>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t.scanPage.twoQuickQuestions}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>{t.scanPage.dimensions}</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => toggleUnit("cm")}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--color-line)",
                        background: unit === "cm" ? "var(--color-deep)" : "transparent",
                        color: unit === "cm" ? "#fff" : "var(--color-ink)",
                        fontSize: "var(--font-caption-size)",
                      }}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleUnit("ft")}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--color-line)",
                        background: unit === "ft" ? "var(--color-deep)" : "transparent",
                        color: unit === "ft" ? "#fff" : "var(--color-ink)",
                        fontSize: "var(--font-caption-size)",
                      }}
                    >
                      ft
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Field label="" placeholder={t.scanPage.length} type="number" value={length} onChange={(e) => setLength(e.target.value)} />
                  <Field label="" placeholder={t.scanPage.width} type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
                  <Field label="" placeholder={t.scanPage.height} type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
                {volumeL !== null && (
                  <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 4 }}>
                    ≈ {volumeL} {t.scanPage.litres}
                  </p>
                )}
              </div>
              <Field label={t.scanPage.city} list="city-options" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.scanPage.cityPlaceholder} />
              <datalist id="city-options">
                {COMMON_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {stage === "scan-error" && scanError && (
              <div style={{ marginTop: 12 }}>
                {scanErrorOffline ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface-alt)", borderLeft: "3px solid var(--color-watch)" }}>
                    <LottiePlayer name="offline" size={40} />
                    <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)" }}>{scanError}</p>
                  </div>
                ) : (
                  <Banner severity="fixNow">{scanError}</Banner>
                )}
              </div>
            )}
            {stage === "scanning" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 12 }}>
                <LottiePlayer name="scanning" size={88} />
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", textAlign: "center" }}>
                  {t.scanPage.usuallyTakes}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </Screen>
  );
}
