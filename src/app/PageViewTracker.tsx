"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordNavigation } from "@/lib/nav-history";

/**
 * Fires a lightweight "this account viewed this page" beacon on every
 * route change, for the admin dashboard's per-account activity view
 * (2026-09-15, Jaideep: "what pages they visited"). Mounted once in the
 * root layout, alongside <ServiceWorkerRegister>/<InstallPromptListener>.
 * Silently no-ops when signed out (the API 401s, we don't care) — the
 * login/onboarding screens aren't meaningful "activity" to track anyway.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    recordNavigation(pathname);
    fetch("/api/track/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
