"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntroAnimation } from "@/components/IntroAnimation";
import { PrimaryButton } from "@/components/Button";
import { markOnboardingComplete } from "@/db/queries/settings";
import { saveProfile } from "@/db/queries/profile";
import { useTranslation } from "@/i18n/use-translation";
import { useLocale } from "@/i18n/use-locale";
import { useTheme, type ThemeChoice } from "@/theme/ThemeProvider";
import type { Locale } from "@/i18n/types";

/**
 * The very first screen a brand-new user sees. Redesigned 2026-09-04 per
 * Jaideep's spec (name/city/language, no "what brings you here?" picker —
 * that choice lives on the My Tanks zero-state instead), then again
 * 2026-09-05 per a reference screenshot he shared: a full-bleed aquarium
 * photo behind the whole screen instead of the plain `Screen` background,
 * with name/city as floating glass cards over it and language/theme as
 * compact toggles rather than a stacked form. Deliberately doesn't use
 * `Screen` — that component's own background/padding assumes a flat
 * surface, and this page needs the photo to run edge-to-edge including
 * behind the safe-area insets.
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
    if (name.trim() || city.trim()) {
      await saveProfile({ name: name.trim() || undefined, city: city.trim() || undefined });
    }
    await markOnboardingComplete();
    router.push("/");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "#021024 url(/onboarding/welcome-bg.jpg) center / cover no-repeat",
      }}
    >
      <IntroAnimation />

      {/* Bottom-to-top scrim so the floating cards and text stay readable
          against any part of the photo, without dimming the top of the
          image where it's already dark and moody. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(to top, rgba(2,16,36,0.85) 0%, rgba(2,16,36,0.35) 45%, rgba(2,16,36,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          padding: "0 20px calc(28px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <h1 style={{ fontSize: "var(--font-display-size)", lineHeight: "var(--font-title-line)", color: "#fff", marginBottom: 4, textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
            {t.onboarding.welcomeTitle}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.82)", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>{t.onboarding.welcomeSubtitle}</p>
        </div>

        <FloatingField label="Name (optional)" value={name} onChange={setName} placeholder="What should we call you?" />
        <FloatingField label="City (optional)" value={city} onChange={setCity} placeholder="Helps suggest local defaults" />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "var(--font-caption-size)", marginBottom: 6 }}>Language</p>
            <SegmentedToggle
              options={([["en", "English"], ["hi-latn", "Hinglish"]] as [Locale, string][]).map(([value, label]) => ({ value, label }))}
              value={locale}
              onChange={setLocale}
            />
          </div>
          <div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "var(--font-caption-size)", marginBottom: 6 }}>Theme</p>
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
        </div>

        <PrimaryButton onClick={handleContinue} disabled={saving}>
          {saving ? "..." : t.onboarding.getStarted}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** A name/city input styled as a floating glass card over the background photo, instead of `Field`'s flat-surface look. */
function FloatingField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.14)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.28)",
        borderRadius: "var(--radius-lg)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "var(--font-caption-size)", marginBottom: 2 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
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
        background: "rgba(255,255,255,0.14)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.28)",
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
            color: value === opt.value ? "var(--color-deep)" : "#fff",
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
