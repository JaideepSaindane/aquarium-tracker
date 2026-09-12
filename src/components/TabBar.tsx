"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/use-translation";
import { AquaIcon, type AquaIconName } from "@/components/icons/AquaIcon";
import styles from "./TabBar.module.css";

const TABS: { href: string; icon: AquaIconName; key: "dex" | "tanks" | "ask" | "community" | "profile"; center?: boolean }[] = [
  { href: "/dex", icon: "dex", key: "dex" },
  { href: "/", icon: "tanks", key: "tanks" },
  { href: "/ask", icon: "ask-aqua", key: "ask", center: true },
  { href: "/community", icon: "community", key: "community" },
  { href: "/settings", icon: "profile", key: "profile" },
];

const BOTTOM_HIDE_PX = 24; // collapse once within this many px of the true bottom of the page
const BOTTOM_SHOW_PX = 64; // reappear once this far from the bottom (hysteresis, avoids flicker right at the edge)

/** Persistent bottom tab bar: Dex, My Tanks, Ask Aqua, Community, My Profile. Home was removed as a tab — Jaideep's call, 2026-09-04 (the cross-tank calendar it pointed to wasn't earning its slot). Ask AquaAI moved from a floating button (see git history — FloatingAskButton was removed 2026-09-10) into a centered tab per Jaideep's "AI-first" ask, so it's a permanent destination rather than something to discover — initially a raised gradient circle, restyled the same day to a small flat teal icon as part of a wider "quieter, neutral nav" pass (see TabBar.module.css). "My Profile" links to the existing Settings screen — no separate profile screen, just a relabeled/repositioned entry point. Floats like a dock and is visible at all times except right at the very bottom of a page's own content, where it collapses out of the way (2026-09-11, Jaideep: "make the bottom nav always on. Collapse it only when the user reaches the bottom of each page.") — this replaced an earlier scroll-direction-based hide/show (hid on any scroll-down, reappeared on scroll-up), which read as unpredictable compared to this simpler rule. */
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
            <span className={`${styles.icon} ${tab.center ? styles.iconCenter : ""}`}>
              <AquaIcon name={tab.icon} size={tab.center ? 18 : 22} />
            </span>
            <span>{t.tabs[tab.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
