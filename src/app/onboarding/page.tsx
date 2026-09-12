"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntroAnimation } from "@/components/IntroAnimation";
import { saveProfile } from "@/db/queries/profile";
import { useTranslation } from "@/i18n/use-translation";
import styles from "./onboarding.module.css";

/**
 * The very first screen a brand-new user sees. Redesigned 2026-09-04 per
 * Jaideep's spec (name/city/language, no "what brings you here?" picker —
 * that choice lives on the My Tanks zero-state instead), then again
 * 2026-09-05 per a reference screenshot: a full-bleed aquarium photo behind
 * the whole screen with name/city as floating glass cards and language/
 * theme as compact toggles, then tuned once more the same day on his live
 * feedback — title moved up to the top third instead of sitting at the
 * bottom, the two fields sit side by side and narrower instead of two
 * full-width stacked pills, placeholder text got a real visible colour
 * (see onboarding.module.css — inline styles can't reach ::placeholder),
 * and Get Started became a compact bright-blue pill instead of the app's
 * standard full-width `PrimaryButton`. Deliberately doesn't use `Screen` —
 * that component's own background/padding assumes a flat surface, and this
 * page needs the photo to run edge-to-edge including behind the safe-area
 * insets.
 *
 * Redesign Section 5 (2026-09-13): city and the language/theme toggles are
 * gone from this screen — the brief's own Screen 4 note ("the current
 * onboarding puts too many unrelated controls in one place... move these
 * into Settings"), and both already live in Settings, reachable any time.
 * Get Started now goes straight into "Show us your aquarium" (the existing
 * scan flow) instead of dropping the user on an empty My Tanks list — the
 * brief's Welcome → name → photo → minimal tank setup order, with the scan
 * flow's own dimensions step and its report screen standing in for "minimal
 * tank setup" once the photo path is picked; "Skip for now" bails a user who
 * doesn't want to photograph a tank straight to the same empty-state choices
 * (scan / build / just look around) that were always the fallback, so
 * nobody is blocked (Principle 1).
 */
export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslation();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    await saveProfile({
      name: name.trim() || undefined,
      onboardingCompletedAt: new Date().toISOString(),
    });
    router.push("/onboarding/scan");
  }

  async function handleSkip() {
    await saveProfile({
      name: name.trim() || undefined,
      onboardingCompletedAt: new Date().toISOString(),
    });
    router.push("/");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#18242b url(/onboarding/welcome-bg.jpg) center / cover no-repeat",
      }}
    >
      <IntroAnimation />

      {/* Top-to-bottom scrim so the title reads clearly against the photo
          up near the top third, on top of the existing bottom scrim that
          keeps the lower controls readable. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(24,36,43,0.55) 0%, rgba(24,36,43,0.1) 22%, rgba(24,36,43,0) 40%), " +
            "linear-gradient(to top, rgba(24,36,43,0.85) 0%, rgba(24,36,43,0.35) 42%, rgba(24,36,43,0) 68%)",
          pointerEvents: "none",
        }}
      />

      {/* Title sits at roughly the top third of the screen, not stacked
          above the form at the bottom. */}
      <div
        style={{
          position: "relative",
          padding: "calc(9dvh + env(safe-area-inset-top, 0px)) 20px 0",
        }}
      >
        <h1 style={{ fontSize: "var(--font-display-size)", lineHeight: "var(--font-title-line)", color: "#fff", marginBottom: 6, textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>
          {t.onboarding.welcomeTitle}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.88)", textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>{t.onboarding.welcomeSubtitle}</p>
      </div>

      {/* Balances the space above and below the name field + button so it
          sits around the vertical centre of the screen, rather than pinned
          to the bottom. The bottom spacer is deliberately smaller so Get
          Started ends up a little above dead-centre, not exactly centred
          with equal space below it. */}
      <div style={{ flex: 1.15 }} />

      <div
        style={{
          position: "relative",
          padding: "0 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <FloatingField label={t.onboardingPage.name} value={name} onChange={setName} placeholder={t.onboardingPage.yourName} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            style={{
              padding: "12px 40px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: "var(--color-deep)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "var(--font-body-size)",
              boxShadow: "var(--shadow-lift)",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "..." : t.onboarding.getStarted}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.78)", fontSize: "var(--font-caption-size)", fontWeight: 600, textDecoration: "underline" }}
          >
            {t.onboardingPage.skipForNow}
          </button>
        </div>
      </div>

      <div style={{ flex: 0.85, minHeight: "calc(16px + env(safe-area-inset-bottom, 0px))" }} />
    </div>
  );
}

/** A name input styled as a floating glass card over the background photo, instead of `Field`'s flat-surface look. */
function FloatingField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "rgba(255,255,255,0.16)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: "var(--radius-lg)",
        padding: "9px 12px",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <label style={{ display: "block", color: "rgba(255,255,255,0.82)", fontSize: "var(--font-caption-size)", marginBottom: 2 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.floatingInput}
        style={{
          width: "100%",
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#fff",
          fontSize: "var(--font-body-size)",
        }}
      />
    </div>
  );
}
