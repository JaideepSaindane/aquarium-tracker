import styles from "./Confidence.module.css";

/**
 * Renders an AI confidence value (0-1) as a label, never a bare number —
 * per docs/03-ai-contracts.md rendering rules: below 0.5 shows "not sure",
 * below 0.35 the caller should render a question instead of this component.
 */
export function Confidence({ value }: { value: number }) {
  const label = value >= 0.8 ? "High confidence" : value >= 0.5 ? "Medium confidence" : "Not sure";
  return <span className={`${styles.confidence} ${value < 0.5 ? styles.notSure : ""}`}>{label}</span>;
}
