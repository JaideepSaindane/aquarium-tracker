"use client";

import { useRef, useState } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { APP_NAME } from "@/constants/app";
import { buildJsonExport, buildCsvZip, buildPhotosZip, downloadBlob } from "@/lib/export";
import { importJsonExport } from "@/lib/import";
import { useTranslation } from "@/i18n/use-translation";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/**
 * Redesign Section 9: export/import used to be real, promised functionality
 * (Principle 4 — "their data is theirs") tucked behind a generic "More"
 * accordion at the bottom of Settings, easy to miss. It's now a real
 * "Export data ›" row under Account on the main Settings screen, landing
 * here — a whole screen for it, not a collapsed afterthought.
 */
export default function ExportSettingsPage() {
  const t = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function withBusy(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage(`${t.settingsPage.somethingWentWrong} ${String(err)}`);
    } finally {
      setBusy(null);
    }
  }

  // Exports always download directly (2026-09-11) rather than offering the
  // Web Share API first — Jaideep hit a real case on Android where sharing
  // a JSON export handed it off to a save target that renamed it with a
  // wrong extension. A plain browser download reliably preserves the exact
  // filename, which matters more here than share convenience.
  async function handleExportJson() {
    await withBusy("json", async () => {
      const data = await buildJsonExport();
      const bytes = JSON.stringify(data, null, 2);
      const filename = `${APP_NAME.toLowerCase()}-export-${timestamp()}.json`;
      downloadBlob(bytes, filename, "application/json");
      setMessage(t.settingsPage.downloadedJson);
    });
  }

  async function handleExportCsv() {
    await withBusy("csv", async () => {
      const zip = await buildCsvZip();
      const filename = `${APP_NAME.toLowerCase()}-tables-${timestamp()}.zip`;
      downloadBlob(zip, filename, "application/zip");
      setMessage(t.settingsPage.downloadedCsv);
    });
  }

  async function handleExportPhotos() {
    await withBusy("photos", async () => {
      const zip = await buildPhotosZip();
      const filename = `${APP_NAME.toLowerCase()}-photos-${timestamp()}.zip`;
      downloadBlob(zip, filename, "application/zip");
      setMessage(t.settingsPage.downloadedPhotos);
    });
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await withBusy("import", async () => {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importJsonExport(data);
      if (result.ok) {
        const total = Object.values(result.attempted).reduce((a, b) => a + b, 0);
        setMessage(
          t.settingsPage.importComplete
            .replace("{rows}", String(total))
            .replace("{tables}", String(Object.keys(result.attempted).length))
        );
      } else {
        setMessage(`${t.settingsPage.importFailed} ${result.error}`);
      }
    });
  }

  return (
    <Screen>
      <BackHeader title={t.settingsPage.exportData} fallbackHref="/settings" />

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settings.exportTitle}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.settings.exportSubtitle}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PrimaryButton onClick={handleExportJson} disabled={busy !== null}>
            {busy === "json" ? t.settingsPage.exporting : t.settingsPage.exportJson}
          </PrimaryButton>
          <SecondaryButton onClick={handleExportCsv} disabled={busy !== null}>
            {busy === "csv" ? t.settingsPage.exporting : t.settingsPage.exportCsv}
          </SecondaryButton>
          <SecondaryButton onClick={handleExportPhotos} disabled={busy !== null}>
            {busy === "photos" ? t.settingsPage.exporting : t.settingsPage.exportPhotos}
          </SecondaryButton>
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.import}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.settingsPage.importBody}</p>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} disabled={busy !== null} style={{ display: "none" }} />
        <SecondaryButton onClick={() => fileInputRef.current?.click()} disabled={busy !== null}>
          {busy === "import" ? t.settingsPage.importing : t.settingsPage.chooseJsonFile}
        </SecondaryButton>
      </Card>

      {message && (
        <div style={{ marginTop: 16 }}>
          <Banner severity="neutral">{message}</Banner>
        </div>
      )}
    </Screen>
  );
}
