"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntroAnimation } from "@/components/IntroAnimation";
import { saveProfile } from "@/db/queries/profile";
import { useTranslation } from "@/i18n/use-translation";
import { useLocale } from "@/i18n/use-locale";
import { useTheme, type ThemeChoice } from "@/theme/ThemeProvider";
import type { Locale } from "@/i18n/types";
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
 */
export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslation();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    await saveProfile({
      name: name.trim() || undefined,
      city: city.trim() || undefined,
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

      {/* Balances the space above and below the name/city + toggles block
          so it sits around the vertical centre of the screen, rather than
          pinned to the bottom. The bottom spacer is deliberately smaller
          so Get Started ends up a little above dead-centre, not exactly
          centred with equal space below it. */}
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
        <div style={{ display: "flex", gap: 10 }}>
          <FloatingField label="Name" value={name} onChange={setName} placeholder="Your name" />
          <FloatingField label="City" value={city} onChange={setCity} placeholder="Your city" />
        </div>

        <div>
          <p style={{ color: "rgba(255,255,255,0.78)", fontSize: "var(--font-caption-size)", marginBottom: 6 }}>Language</p>
          <SegmentedToggle
            options={([["en", "English"], ["hi-latn", "Hinglish"]] as [Locale, string][]).map(([value, label]) => ({ value, label }))}
            value={locale}
            onChange={setLocale}
          />
        </div>

        <div>
          <p style={{ color: "rgba(255,255,255,0.78)", fontSize: "var(--font-caption-size)", marginBottom: 6 }}>Theme</p>
          <SegmentedToggle
            options={[
              { value: "system" as ThemeChoice, label: "⚙️" },
              { value: "light" as ThemeChoice, label: "☀️" },
              { value: "dark" as ThemeChoice, label: "🌙" },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
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
        </div>
      </div>

      <div style={{ flex: 0.85, minHeight: "calc(16px + env(safe-area-inset-bottom, 0px))" }} />
    </div>
  );
}

/** A name/city input styled as a floating glass card over the background photo, instead of `Field`'s flat-surface look. */
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

/** Compact pill toggle used for both the language and theme choices — same glass treatment as `FloatingField` so the whole card cluster reads as one family. */
function SegmentedToggle<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        background: "rgba(255,255,255,0.16)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: "var(--radius-pill)",
        padding: 3,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: value === opt.value ? "#fff" : "transparent",
            color: value === opt.value ? "var(--color-deep)" : "rgba(255,255,255,0.92)",
            fontWeight: 600,
            fontSize: "var(--font-caption-size)",
            whiteSpace: "nowrap",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
