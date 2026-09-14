"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { Confidence } from "@/components/Confidence";
import { GroundingLink } from "@/components/GroundingLink";
import { Banner } from "@/components/Banner";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { useScanSession } from "@/store/use-scan-session";
import { useLocale } from "@/i18n/use-locale";
import { createTank } from "@/db/queries/tanks";
import { createScan } from "@/db/queries/scans";
import { addLogEntry } from "@/db/queries/log-entries";
import { addPhoto } from "@/db/queries/photos";
import { HEALTH_CHECK_CATEGORIES } from "@/server/ai/schemas/health-check";
import type { SeverityLevel } from "@/theme/tokens";
import { useTranslation } from "@/i18n/use-translation";

function healthCategoryMeta(t: ReturnType<typeof useTranslation>): Record<string, { icon: string; label: string }> {
  return {
    water_clarity: { icon: "💧", label: t.checkPage.waterClarity },
    algae: { icon: "🟢", label: t.checkPage.algae },
    fish_appearance: { icon: "🐟", label: t.checkPage.fishAppearance },
    cleanliness: { icon: "🧹", label: t.checkPage.cleanliness },
    plants: { icon: "🌿", label: t.checkPage.plants },
    water_level: { icon: "📏", label: t.checkPage.waterLevel },
    equipment: { icon: "⚙️", label: t.checkPage.equipment },
    stocking: { icon: "🐠", label: t.checkPage.stocking },
  };
}

/** Same 4-tier-to-3-color compression used on the re-check Health Check screen — see tank/[id]/check/page.tsx's identical helper. */
function healthStatusColor(status: string): string {
  if (status === "critical") return "var(--color-fix-now)";
  if (status === "warning") return "var(--color-watch)";
  if (status === "ok") return "var(--color-improve)";
  return "var(--color-ink-muted)"; // watch (framework) and na
}

/**
 * The onboarding first scan now runs the same Health Check contract
 * (health-check/v1) as every later re-check, per Jaideep's direct feedback
 * ("I found the first tank scan to be utterly useless. The health scan was
 * fantastic") — this screen renders it the same way tank/[id]/check's
 * Health Check result does (one crisp category card, then a tips card).
 *
 * The Health Check prompt has no setup/equipment/plant extraction (it's
 * built to assess an already-set-up tank, not describe one for the first
 * time), so — per Jaideep's explicit choice over running two AI calls to
 * keep the old auto-fill — the tank this creates starts bare, exactly like
 * skipping the scan entirely: just dimensions/city, no auto-added
 * equipment or plants. The scan and its findings still get saved to the
 * new tank's journal.
 */
export default function ScanReportPage() {
  const router = useRouter();
  const t = useTranslation();
  const { locale } = useLocale();
  const HEALTH_CATEGORY_META = healthCategoryMeta(t);
  const session = useScanSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.report) router.replace("/onboarding/scan");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.report]);

  const report = session.report;
  if (!report) return <Screen>{t.common.loading}</Screen>;

  const bannerSeverity: SeverityLevel =
    report.overall_status === "critical" ? "fixNow" : report.overall_status === "warning" || report.overall_status === "watch" ? "watch" : "improve";
  const checksByCategory = new Map(report.checks.map((c) => [c.category, c]));
  const tips = report.checks.filter((c) => c.status !== "ok" && c.status !== "na" && c.tip);
  const insufficientPhoto = report.photo_quality === "insufficient";

  async function handleAcceptAndAddLivestock() {
    if (!report || saving) return;
    setSaving(true);
    setError(null);
    try {
      const volumeName =
        session.lengthCm && session.widthCm && session.heightCm
          ? t.reportPage.lTank.replace("{v}", String(Math.round(((session.lengthCm * session.widthCm * session.heightCm) / 1000) * 10) / 10))
          : t.reportPage.myTank;

      const tankId = await createTank({
        name: volumeName,
        lengthCm: session.lengthCm ?? 0,
        widthCm: session.widthCm ?? 0,
        heightCm: session.heightCm ?? 0,
        city: session.city || undefined,
        status: "active",
        photoUri: session.originalPhotoPath ?? undefined,
      });

      if (session.originalPhotoPath) {
        await createScan({
          tankId,
          imageUri: session.originalPhotoPath,
          modelName: session.modelName ?? "unknown",
          promptVersion: report.prompt_version,
          rawResponse: report,
          findings: report.checks,
          scores: { overall_status: report.overall_status },
        });

        const flagged = report.checks.filter((c) => c.status !== "ok" && c.status !== "na");
        const summary = flagged.length > 0 ? flagged.map((c) => `${HEALTH_CATEGORY_META[c.category]?.label ?? c.category}: ${c.status}`).join("; ") : t.checkPage.nothingFlagged;
        const entryId = await addLogEntry({
          tankId,
          type: "journal",
          body: `${t.checkPage.healthCheckParen.replace("{status}", report.overall_status)} ${summary}`,
        });
        await addPhoto({ tankId, logEntryId: entryId, localUri: session.originalPhotoPath });
      }

      // Don't reset the store before navigating — clearing `report`
      // synchronously here would fire this page's own "no report, bounce
      // to /onboarding/scan" guard effect before the navigation below
      // lands, racing it back to the wrong screen. The scan page resets
      // the session itself on next mount instead.
      //
      // router.replace, not push — the tank is already saved at this
      // point, so there's nothing left to "go back to" on this report
      // screen. Paired with the same replace on the scan→report hop, the
      // whole onboarding flow collapses out of history once save
      // succeeds, so the phone/browser back button from here lands on
      // Home (Jaideep, 2026-09-14: "once it's saved it's saved... back
      // button should take me to the home screen").
      router.replace(`/tank/${tankId}/livestock`);
    } catch (err) {
      setError(`${t.reportPage.somethingWentWrongSaving} ${String(err)}`);
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <PrimaryButton onClick={handleAcceptAndAddLivestock} disabled={saving}>
            {saving ? t.reportPage.savingEllipsis : t.reportPage.looksGoodAddLivestock}
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              session.reset();
              router.push("/onboarding/scan");
            }}
            disabled={saving}
          >
            {t.reportPage.retakePhotoInstead}
          </SecondaryButton>
        </>
      }
    >
      <BackHeader title={t.reportPage.tankReport} fallbackHref="/onboarding/scan" />

      {insufficientPhoto && (
        <div style={{ marginBottom: 16 }}>
          <Banner severity="watch">{t.checkPage.photoNotClearReliable}</Banner>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Banner severity={bannerSeverity}>{report.summary}</Banner>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>🩺 {t.checkPage.healthCheck}</p>
        {HEALTH_CHECK_CATEGORIES.map((cat) => {
          const check = checksByCategory.get(cat);
          const meta = HEALTH_CATEGORY_META[cat];
          if (!check) return null;
          return (
            <div key={cat} style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: "1px solid var(--color-line-soft)" }}>
              <span style={{ flexShrink: 0, width: 130, fontSize: "var(--font-caption-size)", fontWeight: 700 }}>
                {meta.icon} {meta.label}
              </span>
              <span style={{ fontSize: "var(--font-body-sm-size)", color: healthStatusColor(check.status) }}>
                {check.status === "na" ? t.checkPage.notVisibleInPhoto : check.observation}
              </span>
            </div>
          );
        })}
      </Card>

      {tips.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>💡 {t.checkPage.tipsAndRecommendations}</p>
          {tips.map((c, i) => {
            const meta = HEALTH_CATEGORY_META[c.category];
            return (
              <div key={c.category} style={{ marginBottom: i < tips.length - 1 ? 12 : 0 }}>
                <p style={{ fontWeight: 600, fontSize: "var(--font-body-sm-size)", marginBottom: 2 }}>
                  {meta.icon} {meta.label}
                </p>
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{c.tip}</p>
                {c.possible_causes.length > 0 && (
                  <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 2 }}>
                    {t.checkPage.possibleCauses} {c.possible_causes.join(", ")}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                  <Confidence value={c.confidence === "high" ? 0.9 : c.confidence === "medium" ? 0.6 : 0.3} />
                  {c.grounding_refs.map((ref) => {
                    const [type, gid] = ref.split(":");
                    return (
                      <GroundingLink
                        key={ref}
                        label={ref}
                        onOpen={type === "species" ? () => router.push(`/dex/${gid}`) : type === "corpus" ? () => router.push(`/corpus/${gid}${locale === "hi-latn" ? "?locale=hi-latn" : ""}`) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {error && (
        <div style={{ marginBottom: 12 }}>
          <Banner severity="fixNow">{error}</Banner>
        </div>
      )}

      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", textAlign: "center" }}>{t.checkPage.visualOnlyDisclaimer}</p>
    </Screen>
  );
}
