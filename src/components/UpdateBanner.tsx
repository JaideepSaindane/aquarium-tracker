"use client";

import { useAppUpdate } from "@/store/use-app-update";
import styles from "./UpdateBanner.module.css";

/**
 * "A new version of AquaAI is ready" — tap to refresh. Shown app-wide
 * (mounted in the root layout, above <TabBar>'s own z-index) whenever
 * ServiceWorkerRegister detects a new build has been deployed while this
 * tab was open. 2026-09-11, Jaideep's ask: ship an update, tell every open
 * tab, one tap gets them current instead of silently drifting out of sync.
 */
export function UpdateBanner() {
  const updateAvailable = useAppUpdate((s) => s.updateAvailable);
  const applying = useAppUpdate((s) => s.applying);
  const applyUpdate = useAppUpdate((s) => s.applyUpdate);

  if (!updateAvailable) return null;

  return (
    <button type="button" className={styles.banner} onClick={applyUpdate} disabled={applying}>
      <span className={styles.dot} aria-hidden />
      {applying ? "Updating…" : "Update available — tap to refresh"}
    </button>
  );
}
