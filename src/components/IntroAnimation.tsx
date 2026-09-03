"use client";

import { useEffect, useRef, useState } from "react";

// 210 frames @ 60fps from the source file (Intro-fish-animation/fish-loader.json, updated 2026-09-04) — a hard ceiling in case the player's onComplete never fires.
const FALLBACK_MS = 4500;

/**
 * The fish-leap intro Lottie. Plays every time onboarding starts — a fresh
 * install (OnboardingGate's redirect) or a deliberate "Start over" from
 * Settings — since that's what actually reads as "opening the app" to
 * Jaideep, not a browser-session boundary (tried first, replaying
 * onboarding mid-session showed nothing, which was the wrong call). Mounted
 * directly on the onboarding page rather than the root layout, so it
 * naturally re-plays every time that page mounts. Source:
 * Intro-fish-animation/, copied into public/animations/ since it needs to
 * be fetchable at runtime.
 */
export function IntroAnimation() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let anim: import("lottie-web").AnimationItem | null = null;

    function dismiss() {
      if (cancelled) return;
      cancelled = true;
      setFading(true);
      setTimeout(() => setVisible(false), 300);
    }

    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !containerRef.current) return;
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: true,
        path: "/animations/fish-loader.json",
      });
      anim.addEventListener("complete", dismiss);
    });

    const fallbackTimer = setTimeout(dismiss, FALLBACK_MS);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      anim?.destroy();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="presentation"
      onClick={() => {
        setFading(true);
        setTimeout(() => setVisible(false), 300);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-ground)",
        opacity: fading ? 0 : 1,
        transition: "opacity 300ms ease",
        cursor: "pointer",
      }}
    >
      <div ref={containerRef} style={{ width: "min(80vw, 400px)" }} />
    </div>
  );
}
