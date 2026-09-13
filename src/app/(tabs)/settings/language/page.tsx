"use client";

import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useLocale } from "@/i18n/use-locale";
import { useTranslation } from "@/i18n/use-translation";
import type { Locale } from "@/i18n/types";

/** Redesign Section 9 — one preference per screen, reached from a "Language ›" row on the main Settings screen instead of an always-visible control embedded there. */
export default function LanguageSettingsPage() {
  const t = useTranslation();
  const { locale, setLocale } = useLocale();

  return (
    <Screen>
      <BackHeader title={t.settings.languageTitle} fallbackHref="/settings" />
      <Card>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 16 }}>{t.settings.languageSubtitle}</p>
        <SegmentedControl
          value={locale}
          onChange={(l) => setLocale(l as Locale)}
          options={[
            { value: "en", label: t.settingsPage.english },
            { value: "hi-latn", label: t.settingsPage.hinglish },
          ]}
        />
      </Card>
    </Screen>
  );
}
