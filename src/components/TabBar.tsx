"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/use-translation";
import styles from "./TabBar.module.css";

const TABS = [
  { href: "/dex", icon: "📇", key: "dex" as const },
  { href: "/", icon: "🐟", key: "tanks" as const },
  { href: "/community", icon: "🌊", key: "community" as const },
];

const HIDE_THRESHOLD_PX = 8; // ignore tiny/bounce scrolls so the dock doesn't jitter
const NEAR_TOP_PX = 40; // always show it near the top of a page regardless of direction

/** Persistent bottom tab bar: Tanks, Dex, Community. Home was removed as a tab — Jaideep's call, 2026-09-04 (the cross-tank calendar it pointed to wasn't earning its slot); Settings moved up next to the notification bell on the Tanks page header instead of living down here. Ask AquaAI is a floating button — see FloatingAskButton. Floats like a dock and hides itself while scrolling down a long list, reappearing on scroll-up — Jaideep's feedback: "should not hide them (hide them smartly when required)." */
export function TabBar() {
  const pathname = usePathname();
  const t = useTranslation();
  const [hidden, setHidden] = useState(false);
  const lastScrollTop = useRef(0);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setHidden(false);
  }

  useEffect(() => {
    // In practice the page itself (window/body) ends up as the scroller on
    // most screens here — Screen's .content only becomes its own scroll
    // container when something constrains its height, which isn't every
    // page. Read window.scrollY for the plain window-scroll event, and
    // also catch any element that DOES scroll internally via a
    // capture-phase listener on the document (its scrollTop, when the
    // event target isn't the document/window itself).
    function currentTop(e: Event): number {
      const target = e.target;
      if (target === document || target === window || !(target instanceof HTMLElement)) {
        return window.scrollY;
      }
      return target.scrollTop;
    }
    function onScroll(e: Event) {
      const top = currentTop(e);
      const delta = top - lastScrollTop.current;
      if (top <= NEAR_TOP_PX) {
        setHidden(false);
      } else if (delta > HIDE_THRESHOLD_PX) {
        setHidden(true);
      } else if (delta < -HIDE_THRESHOLD_PX) {
        setHidden(false);
      }
      lastScrollTop.current = top;
    }
    // A window/body scroll's event target is `document`, so this one
    // capture-phase listener catches both that and any internally
    // scrolling element further down the tree — no separate window
    // listener needed (that would just double-fire for the window case).
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  return (
    <nav className={`${styles.bar} ${hidden ? styles.barHidden : ""}`} aria-label="Main">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.icon} aria-hidden>
              {tab.icon}
            </span>
            <span>{t.tabs[tab.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
