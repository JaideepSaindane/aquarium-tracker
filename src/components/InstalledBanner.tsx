"use client";

import { PrimaryButton } from "@/components/Button";
import { useInstallPrompt } from "@/store/use-install-prompt";
import { useTranslation } from "@/i18n/use-translation";
import { APP_NAME } from "@/constants/app";

/**
 * "Installed! You can close this tab now" — a modal, not a banner, shown
 * right on the same screen the user tapped Install App from, once the
 * browser's `appinstalled` event fires (captured in InstallPromptListener).
 * Jaideep: after installing, someone now has both the freshly installed
 * app AND this original browser tab open, and a small toast was easy to
 * miss — he asked for a real popup here instead. Same dialog pattern as
 * FeedbackModal.
 */
export function InstalledBanner() {
  const t = useTranslation();
  const justInstalled = useInstallPrompt((s) => s.justInstalled);
  const dismissJustInstalled = useInstallPrompt((s) => s.dismissJustInstalled);

  if (!justInstalled) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.installApp.installedTitle}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.5)",
        padding: 24,
      }}
      onClick={dismissJustInstalled}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          padding: 20,
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
        <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 6, color: "var(--color-ink)" }}>
          {t.installApp.installedTitle}
        </p>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 16 }}>
          {t.installApp.installedBanner.replace("{app}", APP_NAME)}
        </p>
        <PrimaryButton onClick={dismissJustInstalled}>{t.installApp.gotIt}</PrimaryButton>
      </div>
    </div>
  );
}
