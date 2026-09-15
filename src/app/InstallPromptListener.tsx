"use client";

import { useEffect } from "react";
import { useInstallPrompt } from "@/store/use-install-prompt";

/**
 * Captures Chrome/Android's `beforeinstallprompt` event globally at app
 * boot and stashes it in the zustand store, so a button anywhere in the
 * app (Settings, Home) can trigger the real install prompt later. This
 * event fires early and only once nothing else has swallowed it — sitting
 * next to <ServiceWorkerRegister> in the root layout, same pattern.
 */
export function InstallPromptListener() {
  const setDeferredPrompt = useInstallPrompt((s) => s.setDeferredPrompt);
  const markInstalled = useInstallPrompt((s) => s.markInstalled);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDeferredPrompt(e as any);
    }
    function onAppInstalled() {
      markInstalled();
      // Beacon for the admin dashboard's real install counts (2026-09-15)
      // — fire-and-forget, never blocks the install itself on this.
      fetch("/api/track/install", { method: "POST" }).catch(() => {});
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [setDeferredPrompt, markInstalled]);

  return null;
}
