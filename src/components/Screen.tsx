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
  footerAboveDock,
}: {
  children: ReactNode;
  background?: string;
  /** Buttons pinned to the bottom of the viewport — always visible, never scrollable out of reach. */
  footer?: ReactNode;
  /** The bottom tab bar now renders on every route including /ask, so a screen with its own sticky footer (e.g. Ask AquaAI's composer) needs to sit above the dock instead of underneath it. */
  footerAboveDock?: boolean;
}) {
  return (
    <div className={styles.screen} style={background ? { background } : undefined}>
      <div className={`${styles.content} ${footer ? styles.contentWithFooter : ""} ${footer && footerAboveDock ? styles.contentWithFooterAboveDock : ""}`}>
        {children}
      </div>
      {footer && <div className={`${styles.stickyFooter} ${footerAboveDock ? styles.stickyFooterAboveDock : ""}`}>{footer}</div>}
    </div>
  );
}
