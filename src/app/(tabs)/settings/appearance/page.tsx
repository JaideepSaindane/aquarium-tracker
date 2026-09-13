"use client";

import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useTheme, type ThemeChoice } from "@/theme/ThemeProvider";
import { useTranslation } from "@/i18n/use-translation";

/** Redesign Section 9 — one preference per screen, reached from an "Appearance ›" row on the main Settings screen instead of an always-visible control embedded there. */
export default function AppearanceSettingsPage() {
  const t = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <Screen>
      <BackHeader title={t.settingsPage.appearance} fallbackHref="/settings" />
      <Card>
        <SegmentedControl
          value={theme}
          onChange={(th) => setTheme(th as ThemeChoice)}
          options={[
            { value: "system", label: t.settingsPage.themeSystem },
            { value: "light", label: t.settingsPage.themeLight },
            { value: "dark", label: t.settingsPage.themeDark },
          ]}
        />
      </Card>
    </Screen>
  );
}
