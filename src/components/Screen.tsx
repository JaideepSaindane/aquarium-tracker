import type { ReactNode } from "react";
import styles from "./Screen.module.css";

/**
 * Safe-area wrapper, background, scroll behaviour, standard padding. Every
 * route renders one of these. `background` is an escape hatch for the
 * handful of screens using the scoped "soft" palette (tokens.css
 * `--soft-*`) instead of the app's normal `--color-ground` — an inline
 * style always wins over the CSS class's var-based background, so this
 * never needs a new CSS class per screen.
 */
export function Screen({
  children,
  background,
  footer,
}: {
  children: ReactNode;
  background?: string;
  /** Buttons pinned to the bottom of the viewport — always visible, never scrollable out of reach. */
  footer?: ReactNode;
}) {
  return (
    <div className={styles.screen} style={background ? { background } : undefined}>
      <div className={`${styles.content} ${footer ? styles.contentWithFooter : ""}`}>{children}</div>
      {footer && <div className={styles.stickyFooter}>{footer}</div>}
    </div>
  );
}
