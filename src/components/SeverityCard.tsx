import type { ReactNode } from "react";
import type { SeverityLevel } from "@/theme/tokens";
import { severityMeta } from "@/theme/severity-meta";
import styles from "./SeverityCard.module.css";

/** Card with a left severity stripe, icon and label. The Tank Report's unit. */
export function SeverityCard({
  severity,
  title,
  children,
}: {
  severity: SeverityLevel;
  title: string;
  children?: ReactNode;
}) {
  const meta = severityMeta[severity];
  return (
    <div className={styles.card} style={{ borderLeftColor: `var(${meta.cssVar})` }}>
      <div className={styles.headerRow}>
        <span className={styles.icon} style={{ color: `var(${meta.cssVar})` }} aria-hidden>
          {meta.icon}
        </span>
        <span className={styles.label} style={{ color: `var(${meta.cssVar})` }}>
          {meta.label}
        </span>
      </div>
      <p className={styles.title}>{title}</p>
      {children ? <p className={styles.body}>{children}</p> : null}
    </div>
  );
}
