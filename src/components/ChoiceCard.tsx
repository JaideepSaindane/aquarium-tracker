import type { ReactNode } from "react";
import styles from "./ChoiceCard.module.css";

/**
 * A selectable card — Section 2 primitive for the "choice card" pattern
 * the redesign brief calls for (tank-type picker, planner steps, etc.):
 * selected = aqua border + aqua tint + a checkmark, unselected = the plain
 * Card surface. A real ≥44px tap target via `<button>` + padding, not a
 * shrunk custom hitbox.
 */
export function ChoiceCard({
  selected,
  onClick,
  title,
  subtitle,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${styles.card} ${selected ? styles.selected : ""}`}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.textCol}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      {selected && (
        <span className={styles.check} aria-hidden>
          ✓
        </span>
      )}
    </button>
  );
}
