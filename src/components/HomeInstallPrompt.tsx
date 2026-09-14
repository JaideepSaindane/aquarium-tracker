"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { IosInstallSheet } from "@/components/IosInstallSheet";
import { isIOS, isStandalone, subscribeStandalone } from "@/components/InstallAppButton";
import { useInstallPrompt } from "@/store/use-install-prompt";
import { useTranslation } from "@/i18n/use-translation";
import { APP_NAME } from "@/constants/app";

const SESSION_KEY = "aquaai-home-install-prompt-shows";
const MAX_SHOWS_PER_SESSION = 2;

function getShowCount(): number {
  if (typeof sessionStorage === "undefined") return MAX_SHOWS_PER_SESSION;
  return Number(sessionStorage.getItem(SESSION_KEY) ?? "0");
}

function recordShow() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, String(getShowCount() + 1));
}

/**
 * Home's own "Install this app" popup — Jaideep: prompt on the homepage
 * the first time someone lands there, and again a second time in that
 * same (browser) session, rather than only offering install as a button
 * someone has to go find in Settings. Capped at two shows per
 * `sessionStorage` lifetime (cleared when the tab/browser closes) so it
 * doesn't nag on every single visit to Home.
 *
 * Reuses the same deferredPrompt/iOS-detection plumbing as
 * <InstallAppButton> — this is a second entry point into the same install
 * flow, not a separate one.
 */
export function HomeInstallPrompt() {
  const t = useTranslation();
  const deferredPrompt = useInstallPrompt((s) => s.deferredPrompt);
  const installed = useInstallPrompt((s) => s.installed);
  const promptInstall = useInstallPrompt((s) => s.promptInstall);
  const alreadyStandalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  const [visible, setVisible] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [shownThisMount, setShownThisMount] = useState(false);

  const eligible = !installed && !alreadyStandalone && (!!deferredPrompt || isIOS());

  useEffect(() => {
    if (shownThisMount || !eligible) return;
    if (getShowCount() >= MAX_SHOWS_PER_SESSION) return;
    // A brief delay so this doesn't compete with Home's own initial
    // render/data-load — feels like a considered nudge, not a jump-scare
    // the instant the page paints.
    const timer = setTimeout(() => {
      setVisible(true);
      setShownThisMount(true);
      recordShow();
    }, 1200);
    return () => clearTimeout(timer);
  }, [eligible, shownThisMount]);

  if (!visible) return null;

  async function handleInstall() {
    setVisible(false);
    if (deferredPrompt) {
      await promptInstall();
      return;
    }
    setShowIosSheet(true);
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.installApp.homePromptTitle}
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
        onClick={() => setVisible(false)}
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
          <p style={{ fontSize: 32, marginBottom: 8 }}>📲</p>
          <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 6, color: "var(--color-ink)" }}>
            {t.installApp.homePromptTitle}
          </p>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 16 }}>
            {t.installApp.homePromptBody.replace("{app}", APP_NAME)}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <SecondaryButton onClick={() => setVisible(false)}>{t.installApp.notNow}</SecondaryButton>
            <PrimaryButton onClick={handleInstall}>{t.installApp.button}</PrimaryButton>
          </div>
        </div>
      </div>
      {showIosSheet && <IosInstallSheet onClose={() => setShowIosSheet(false)} />}
    </>
  );
}
