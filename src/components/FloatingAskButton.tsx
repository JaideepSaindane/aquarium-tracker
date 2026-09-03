import Link from "next/link";
import styles from "./FloatingAskButton.module.css";

/** Floating entry point to Ask AquaAI. Replaced the old top-level "Ask" tab when Community took that slot — see specs/PROGRESS.md 2026-09-01. Deliberately glass, not matte — it floats over content, unlike the flat cards beneath it. */
export function FloatingAskButton() {
  return (
    <Link href="/ask" aria-label="Ask AquaAI" className={styles.button}>
      <span aria-hidden>💬</span>
    </Link>
  );
}
