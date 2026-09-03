import type { ReactNode } from "react";
import type { SeverityLevel } from "@/theme/tokens";
import { severityMeta } from "@/theme/severity-meta";
import styles from "./Banner.module.css";

/** Dismissible inline warning, severity-coloured. Per Principle 01, a Banner never blocks the action beneath it. */
export function Banner({
  severity = "neutral",
  onDismiss,
  children,
}: {
  severity?: SeverityLevel;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const meta = severityMeta[severity];
  return (
    <div className={styles.banner} style={{ borderLeftColor: `var(${meta.cssVar})` }} role="status">
      <p className={styles.text}>{children}</p>
      {onDismiss ? (
        <button className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
          ✕
        </button>
      ) : null}
    </div>
  );
}
