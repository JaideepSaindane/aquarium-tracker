"use client";

import { useState, useSyncExternalStore } from "react";
import { SecondaryButton } from "@/components/Button";
import { IosInstallSheet } from "@/components/IosInstallSheet";
import { useInstallPrompt } from "@/store/use-install-prompt";
import { useTranslation } from "@/i18n/use-translation";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own non-standard flag — no `display-mode` media query support there.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// Read via useSyncExternalStore rather than state+effect — this reads a
// live browser API (display-mode media query) that can change out from
// under React (a Chrome dev-tools mode swap, or Safari after the user
// actually installs), and useSyncExternalStore is the pattern React's own
// lint rule wants for exactly this instead of a setState-in-effect.
export function subscribeStandalone(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * "Install App" — one tap instead of Chrome menu → Settings → Install.
 * On Chrome/Android (or desktop Chrome), this triggers the real native
 * install prompt captured by <InstallPromptListener>. iOS Safari has no
 * install-prompt API at all, so there it opens a short instruction sheet
 * instead — the closest a real one-tap flow gets on that platform.
 * Renders nothing once the app is already running installed (standalone).
 */
export function InstallAppButton() {
  const t = useTranslation();
  const deferredPrompt = useInstallPrompt((s) => s.deferredPrompt);
  const installed = useInstallPrompt((s) => s.installed);
  const promptInstall = useInstallPrompt((s) => s.promptInstall);
  const alreadyStandalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  if (installed || alreadyStandalone) return null;
  // Neither a captured native prompt nor iOS — nothing this button could
  // usefully do (desktop Firefox/Safari, or Chrome before the event has
  // fired yet), so it stays hidden rather than promising a tap that does
  // nothing.
  if (!deferredPrompt && !isIOS()) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await promptInstall();
      return;
    }
    setShowIosSheet(true);
  }

  return (
    <>
      <SecondaryButton onClick={handleClick}>{t.installApp.button}</SecondaryButton>
      {showIosSheet && <IosInstallSheet onClose={() => setShowIosSheet(false)} />}
    </>
  );
}
