"use client";

import { useEffect } from "react";
import { PrimaryButton } from "./Button";
import { LottiePlayer } from "./LottiePlayer";
import styles from "./DexUnlockToast.module.css";

/**
 * The Dex's one deliberate moment of delight (specs/T-021 — "the one place
 * in the app where a real animation is warranted"). The CSS handles turning
 * itself off under prefers-reduced-motion; this component doesn't need to
 * know which mode it's in — the unlock is real either way, only the pop/fade
 * flourish is skipped.
 *
 * Auto-dismisses after ~2.5s and never blocks the page underneath for longer
 * than that — in the additive add-fish flow (Jaideep, 2026-09-06) the user
 * adds fish one after another, and a modal toast demanding a tap each time
 * would break the rhythm. The overlay still dismisses on tap for anyone who
 * wants to move on faster.
 */
export function DexUnlockToast({ speciesName, onDismiss }: { speciesName: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LottiePlayer name="unlock" loop={false} size={96} respectReducedMotion />
        </div>
        <p style={{ fontWeight: 700, fontSize: "var(--font-heading-size)", marginBottom: 4 }}>Dex card unlocked!</p>
        <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>{speciesName}</p>
        <PrimaryButton onClick={onDismiss}>Nice!</PrimaryButton>
      </div>
    </div>
  );
}
