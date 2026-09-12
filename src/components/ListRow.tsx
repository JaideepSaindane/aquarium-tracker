import type { ReactNode } from "react";
import styles from "./ListRow.module.css";

/**
 * icon + label + secondary metadata + chevron — Section 2 primitive. The
 * redesign audit found "Card-as-default-container" used for every kind of
 * row (journal entries, livestock rows, Dex rows, Fish/Photos/Journal
 * counts on Tank Detail) with no shared row pattern, each reinventing its
 * own padding/border/tap-target sizing. `ListRow` is that shared pattern:
 * a real ≥44px tap target (via `as="button"`), an optional leading icon,
 * a primary label, optional secondary metadata under it, and an optional
 * trailing chevron for "this row navigates somewhere."
 */
export function ListRow({
  icon,
  label,
  meta,
  trailing,
  showChevron = false,
  onClick,
  className,
}: {
  icon?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.textCol}>
        <span className={styles.label}>{label}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </div>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
      {showChevron && (
        <span className={styles.chevron} aria-hidden>
          ›
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={[styles.row, styles.rowButton, className].filter(Boolean).join(" ")}>
        {content}
      </button>
    );
  }

  return <div className={[styles.row, className].filter(Boolean).join(" ")}>{content}</div>;
}
