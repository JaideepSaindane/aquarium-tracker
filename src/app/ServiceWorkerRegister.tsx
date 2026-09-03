"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell service worker. Deliberately minimal for T-010 —
 * it does not yet cache anything meaningful, and Web Push comes in T-018.
 * This just proves the PWA install path (manifest + a controlling SW) works
 * end to end before any feature depends on it.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }
  }, []);

  return null;
}
