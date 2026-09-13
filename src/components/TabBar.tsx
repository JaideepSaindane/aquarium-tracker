"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/use-translation";
import styles from "./TabBar.module.css";

const TABS: { href: string; key: "dex" | "tanks" | "ask" | "community" | "profile" }[] = [
  { href: "/dex", key: "dex" },
  { href: "/", key: "tanks" },
  { href: "/ask", key: "ask" },
  { href: "/community", key: "community" },
  { href: "/settings", key: "profile" },
];

const BOTTOM_HIDE_PX = 24; // collapse once within this many px of the true bottom of the page
const BOTTOM_SHOW_PX = 64; // reappear once this far from the bottom (hysteresis, avoids flicker right at the edge)

/**
 * Persistent bottom tab bar: Home, Dex, Ask Aqua, Community, My Profile.
 * Restyled 2026-09-13 (Jaideep, pointing at a reference mockup: "make the
 * bottom nav a bit differently coloured... dont keep the bottom nav the
 * same as now") — dropped the floating rounded glass dock with icon-pill
 * highlights for the reference's flatter, plainer pattern: a bar attached
 * flush to the bottom edge (not floating with side margins), plain text
 * labels only (no icons — the reference has none), and a small dot under
 * the active label instead of a filled background pill. Kept the app's own
 * aqua accent for the active state rather than the mockup's navy palette —
 * this app has one brand colour reserved for exactly this kind of active/
 * primary state (docs/04-design-system.md), swapping it for a foreign hue
 * would fight that system rather than follow the mockup's actual point
 * (a calmer, flatter nav). Still floats via `position: fixed` and still
 * collapses at the very bottom of a page's own content (2026-09-11 rule),
 * just without the rounded-corner/side-margin/blur treatment.
 */
export function TabBar() {
  const pathname = usePathname();
  const t = useTranslation();
  const [hidden, setHidden] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setHidden(false);
  }

  useEffect(() => {
    // In practice the page itself (window/body) ends up as the scroller on
    // most screens here — Screen's .content only becomes its own scroll
    // container when something constrains its height, which isn't every
    // page. Read window metrics for the plain window-scroll event, and
    // also catch any element that DOES scroll internally via a
    // capture-phase listener on the document (its own metrics, when the
    // event target isn't the document/window itself).
    function metrics(e: Event): { top: number; viewport: number; total: number } {
      const target = e.target;
      if (target === document || target === window || !(target instanceof HTMLElement)) {
        const doc = document.documentElement;
        return { top: window.scrollY, viewport: window.innerHeight, total: doc.scrollHeight };
      }
      return { top: target.scrollTop, viewport: target.clientHeight, total: target.scrollHeight };
    }
    function onScroll(e: Event) {
      const { top, viewport, total } = metrics(e);
      // A page shorter than the viewport (nothing to scroll) is never
      // "at the bottom" in any meaningful sense — always show the bar.
      if (total <= viewport + BOTTOM_SHOW_PX) {
        setHidden(false);
        return;
      }
      const distanceFromBottom = total - (top + viewport);
      if (distanceFromBottom <= BOTTOM_HIDE_PX) {
        setHidden(true);
      } else if (distanceFromBottom >= BOTTOM_SHOW_PX) {
        setHidden(false);
      }
      // else: within the hysteresis band — leave as-is, avoids flicker
    }
    // A window/body scroll's event target is `document`, so this one
    // capture-phase listener catches both that and any internally
    // scrolling element further down the tree — no separate window
    // listener needed (that would just double-fire for the window case).
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  return (
    <nav className={`${styles.bar} ${hidden ? styles.barHidden : ""}`} aria-label={t.tabBar.main}>
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span>{t.tabs[tab.key]}</span>
            <span className={styles.dot} aria-hidden />
          </Link>
        );
      })}
    </nav>
  );
}
