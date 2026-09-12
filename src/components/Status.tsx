import styles from "./Status.module.css";

export type StatusVariant = "improve" | "watch" | "fixNow" | "neutral";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * icon + label + explanation — Section 2 primitive, fixing the redesign
 * brief's own named example (Part 1 §11): "Never have '● Healthy' with no
 * explanation." A dot alone is unfalsifiable and, worse, actively hides
 * whether there's real data behind it. `explanation` is required (not
 * optional) on purpose — this component shouldn't exist without one; if a
 * screen has nothing to say, it should show nothing rather than a bare dot.
 */
export function Status({
  variant = "neutral",
  label,
  explanation,
}: {
  variant?: StatusVariant;
  label: string;
  explanation: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.headline}>
        <span className={`${styles.dot} ${styles[`dot${capitalize(variant)}`]}`} aria-hidden />
        <span className={`${styles.label} ${styles[`label${capitalize(variant)}`]}`}>{label}</span>
      </div>
      <p className={styles.explanation}>{explanation}</p>
    </div>
  );
}
