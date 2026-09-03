"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { IntroAnimation } from "@/components/IntroAnimation";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/Button";
import { markOnboardingComplete } from "@/db/queries/settings";
import { saveProfile } from "@/db/queries/profile";
import { useTranslation } from "@/i18n/use-translation";
import { useLocale } from "@/i18n/use-locale";
import type { Locale } from "@/i18n/types";

/**
 * The very first screen a brand-new user sees — redesigned 2026-09-04 per
 * Jaideep's direct spec. Deliberately NOT the old "what brings you here?"
 * three-door picker: that choice (already have a tank / help me build one)
 * moved to the My Tanks zero-state instead, so this step stays short —
 * just name/city/language — and gets someone exploring the app fast
 * rather than committing to a long flow before they've seen any value.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslation();
  const { locale, setLocale } = useLocale();
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
    <Screen>
      <IntroAnimation />
      <h1 style={{ fontSize: "var(--font-title-size)", lineHeight: "var(--font-title-line)", marginBottom: 4 }}>
        {t.onboarding.welcomeTitle}
      </h1>
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 24 }}>{t.onboarding.welcomeSubtitle}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <Field label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" />
        <Field label="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Helps suggest local defaults" />
      </div>

      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 6 }}>Language</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {(["en", "hi-latn"] as Locale[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              background: locale === l ? "var(--color-deep)" : "transparent",
              color: locale === l ? "#fff" : "var(--color-ink)",
              fontWeight: 600,
            }}
          >
            {l === "en" ? "English" : "Hinglish"}
          </button>
        ))}
      </div>

      <PrimaryButton onClick={handleContinue} disabled={saving}>
        {saving ? "..." : t.onboarding.getStarted}
      </PrimaryButton>
    </Screen>
  );
}
