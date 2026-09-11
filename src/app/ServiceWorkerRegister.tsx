"use client";

import { useEffect } from "react";
import { useAppUpdate } from "@/store/use-app-update";

// Check for a newer deployed build this often while the app is open, plus
// every time the tab comes back into focus (covers the common case: app
// was backgrounded, a deploy happened, user reopens it). Lightweight on
// purpose (2026-09-11, Jaideep's ask) — no server round trip of our own,
// just asking the browser to re-fetch /sw.js and compare bytes, which is
// what registration.update() does.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Registers the app-shell service worker and watches for a new one being
 * installed — see public/sw.js's own note on why it no longer
 * self.skipWaiting()s automatically. When a new worker finishes installing
 * while an existing one is already controlling the page (i.e. this is a
 * real update, not the very first install), marks it in useAppUpdate so
 * <UpdateBanner> can offer the user a tap-to-refresh.
 */
export function ServiceWorkerRegister() {
  const setRegistration = useAppUpdate((s) => s.setRegistration);
  const markUpdateAvailable = useAppUpdate((s) => s.markUpdateAvailable);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    function onVisible() {
      if (document.visibilityState === "visible") void registrationRef?.update().catch(() => {});
    }
    let registrationRef: ServiceWorkerRegistration | null = null;

    function watchInstalling(installing: ServiceWorker | null) {
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          markUpdateAvailable();
        }
      });
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) return;
        registrationRef = registration;
        setRegistration(registration);

        // A worker may already be sitting in "waiting" from before this
        // page load (e.g. it installed while the tab was backgrounded).
        if (registration.waiting && navigator.serviceWorker.controller) {
          markUpdateAvailable();
        }

        registration.addEventListener("updatefound", () => watchInstalling(registration.installing));

        interval = setInterval(() => registration.update().catch(() => {}), CHECK_INTERVAL_MS);
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      setRegistration(null);
    };
  }, [setRegistration, markUpdateAvailable]);

  return null;
}
