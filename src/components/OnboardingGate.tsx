"use client";

import { useEffect, useState, type ReactNode } from "react";
import { stampInstalledAtIfMissing } from "@/db/queries/settings";
import { getProfile, saveProfile } from "@/db/queries/profile";

/**
 * "From first launch, the stage picker appears immediately" (specs/T-023,
 * acceptance criterion 1) and "does not appear again on the next launch"
 * (criterion 9). Lives inside the tabs layout so it runs once the DB is
 * already booted (DbBootProvider wraps everything above this) — checked
 * exactly once per app load, not on every tab switch.
 *
 * Checked against the signed-in account's server-side profile
 * (`onboardingCompletedAt`), not a local-device flag — accounts landed
 * 2026-09-10, and a local flag is scoped to a browser, not an account. A
 * fresh account signing in on a browser that had already onboarded a
 * different account used to skip onboarding incorrectly and land on an
 * empty "My Tanks" (plus whatever language that browser last had set).
 *
 * Wraps `children` (2026-09-13) rather than rendering standalone —
 * Jaideep hit a real bug signing up fresh with Google: the tabs layout's
 * real content (My Tanks, with its placeholder "Welcome, Aquarist" before
 * the profile loads) rendered and was visible for a moment before this
 * gate's async profile check resolved and redirected to /onboarding. This
 * withholds `children` until the check finishes — the same "don't show
 * real content before you know which screen it should be" principle
 * DbBootProvider already applies to the whole app's boot.
 *
 * Shows the same "Loading..." treatment as DbBootProvider's own boot
 * screen while withheld (not a bare `null`) — Jaideep hit the withheld
 * state itself read as a second real bug the same day: with nothing on
 * screen, the page body's own near-black ground colour (the app's dark
 * default) showed through with zero indication anything was happening,
 * described as "a blank black thing" between the onboarding flow and My
 * Tanks appearing.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    stampInstalledAtIfMissing();
    getProfile().then(async (profile) => {
      if (cancelled) return;
      // New signups land straight on Home (Jaideep, 2026-09-15) — no welcome
      // or "scan your tank" step on first open. Stamped so this runs once;
      // Settings → Onboarding can still replay the flow on purpose.
      if (!profile?.onboardingCompletedAt) {
        await saveProfile({ onboardingCompletedAt: new Date().toISOString() }).catch(() => {});
      }
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-ground)" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
      </div>
    );
  }
  return <>{children}</>;
}
