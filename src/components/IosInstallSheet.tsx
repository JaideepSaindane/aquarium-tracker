"use client";

import { SecondaryButton } from "@/components/Button";
import { useTranslation } from "@/i18n/use-translation";
import { APP_NAME } from "@/constants/app";

/**
 * The "tap Share, then Add to Home Screen" instruction sheet — iOS Safari
 * has no install-prompt API at all, so this is the closest a one-tap flow
 * gets there. Shared between <InstallAppButton> (Settings) and
 * <HomeInstallPrompt> (the homepage nudge) so both trigger the exact same
 * instructions rather than drifting apart.
 */
export function IosInstallSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.installApp.iosTitle}
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
      onClick={onClose}
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
        }}
      >
        <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 10, color: "var(--color-ink)" }}>
          {t.installApp.iosTitle}
        </p>
        <ol style={{ margin: 0, paddingLeft: 20, color: "var(--color-ink)", fontSize: "var(--font-body-sm-size)", display: "flex", flexDirection: "column", gap: 8 }}>
          <li>{t.installApp.iosStep1}</li>
          <li>{t.installApp.iosStep2.replace("{app}", APP_NAME)}</li>
          <li>{t.installApp.iosStep3}</li>
        </ol>
        <div style={{ marginTop: 16 }}>
          <SecondaryButton onClick={onClose}>{t.installApp.gotIt}</SecondaryButton>
        </div>
      </div>
    </div>
  );
}
