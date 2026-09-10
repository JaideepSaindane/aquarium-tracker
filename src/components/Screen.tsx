"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  // The sticky footer's own CSS class reserves a *fixed* clearance
  // (96px) in `.content`'s bottom padding — but a footer's real height
  // varies (e.g. an extra "✓ N fish added this session" line growing it
  // taller), and a fixed reservation smaller than the real footer just
  // lets it cover the bottom of the scrollable content underneath it. A
  // real bug Jaideep hit on the add-fish screen. Measured live instead.
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!footer || !footerRef.current) {
      setFooterHeight(null);
      return;
    }
    const el = footerRef.current;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h != null) setFooterHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [footer]);

  return (
    <div className={styles.screen} style={background ? { background } : undefined}>
      <div
        className={`${styles.content} ${footer ? styles.contentWithFooter : ""} ${footer && footerAboveDock ? styles.contentWithFooterAboveDock : ""}`}
        style={footer && footerHeight != null ? { paddingBottom: `calc(${footerHeight}px + var(--space-lg) + env(safe-area-inset-bottom)${footerAboveDock ? " + var(--dock-clearance)" : ""})` } : undefined}
      >
        {children}
      </div>
      {footer && (
        <div ref={footerRef} className={`${styles.stickyFooter} ${footerAboveDock ? styles.stickyFooterAboveDock : ""}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
