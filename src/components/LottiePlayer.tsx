"use client";

import { useEffect, useRef } from "react";

/**
 * Thin wrapper around `lottie-web` (already a dependency — see
 * IntroAnimation) for the small state-pack animations Jaideep supplied
 * 2026-09-05 (`All animation files/`, copied into `public/animations/`):
 * thinking, scanning, grounding, listening, triage, success, offline,
 * unlock. Each is a real named state the app already has a moment for —
 * see the components/screens that use this for which. Loading states
 * (thinking/scanning/triage/listening) intentionally ignore
 * prefers-reduced-motion — the motion there communicates real progress,
 * not decoration, same reasoning the platform uses for a native spinner.
 * One-shot celebratory plays (unlock/success) are gated by the caller
 * instead (DexUnlockToast already has its own reduced-motion handling).
 */
export function LottiePlayer({
  name,
  loop = true,
  autoplay = true,
  size = 48,
  onComplete,
  className,
  respectReducedMotion = false,
}: {
  name: "thinking" | "scanning" | "grounding" | "listening" | "triage" | "success" | "offline" | "unlock";
  loop?: boolean;
  autoplay?: boolean;
  size?: number;
  onComplete?: () => void;
  className?: string;
  /** For a celebratory one-shot (unlock/success) where the event itself must still happen but the motion is optional flourish — freezes on the first frame instead of playing. Loading states (thinking/scanning/etc) leave this false; they communicate real progress, not decoration. */
  respectReducedMotion?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let anim: import("lottie-web").AnimationItem | null = null;
    const reduceMotion = respectReducedMotion && typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !containerRef.current) return;
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: reduceMotion ? false : loop,
        autoplay: reduceMotion ? false : autoplay,
        path: `/animations/${name}.json`,
      });
      if (reduceMotion) {
        onComplete?.();
      } else if (onComplete) {
        anim.addEventListener("complete", onComplete);
      }
    });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return <div ref={containerRef} aria-hidden style={{ width: size, height: size, flexShrink: 0 }} className={className} />;
}
