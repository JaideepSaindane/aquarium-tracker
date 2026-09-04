"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./FloatingAskButton.module.css";

/**
 * Floating entry point to Ask AquaAI. Originally a plain 56px glass circle
 * shown only on the Tanks page — redesigned 2026-09-05 per Jaideep's ask to
 * make the chat more prominent: now a labelled bright-blue pill with a
 * gentle glow/pulse (a `prefers-reduced-motion`-respecting CSS animation,
 * not JS) so it reads as the app's headline action rather than a small
 * incidental icon, and rendered once in the shared tabs layout so it's
 * reachable from every tab (Tanks, Dex, Community, Home, Settings), not
 * just the one screen it used to live on. Hides itself on `/ask` — no
 * point floating a button to a screen you're already on.
 */
export function FloatingAskButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/ask")) return null;

  return (
    <Link href="/ask" aria-label="Ask AquaAI" className={styles.button}>
      <span className={styles.glow} aria-hidden />
      <span aria-hidden style={{ fontSize: 20 }}>
        💬
      </span>
      <span>Ask AquaAI</span>
    </Link>
  );
}
