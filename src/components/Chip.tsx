import styles from "./Chip.module.css";

export type ChipVariant = "neutral" | "fixNow" | "watch" | "improve" | "unverified" | "pro";

/** Small status pill. Severity, verified/unverified, free/pro. */
export function Chip({ variant = "neutral", children }: { variant?: ChipVariant; children: React.ReactNode }) {
  return <span className={`${styles.chip} ${styles[variant]}`}>{children}</span>;
}
