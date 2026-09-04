"use client";

import { PrimaryButton } from "./Button";
import { LottiePlayer } from "./LottiePlayer";
import styles from "./DexUnlockToast.module.css";

/**
 * The Dex's one deliberate moment of delight (specs/T-021 — "the one place
 * in the app where a real animation is warranted"). The CSS handles turning
 * itself off under prefers-reduced-motion; this component doesn't need to
 * know which mode it's in — the unlock is real either way, only the pop/fade
 * flourish is skipped.
 */
export function DexUnlockToast({ speciesName, onDismiss }: { speciesName: string; onDismiss: () => void }) {
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
