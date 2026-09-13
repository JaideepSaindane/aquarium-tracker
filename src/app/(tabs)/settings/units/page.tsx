"use client";

import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useUnitsContext } from "@/lib/UnitsProvider";
import { useTranslation } from "@/i18n/use-translation";
import type { UnitSystem } from "@/lib/units";

/** Redesign Section 9 — one preference per screen, reached from a "Units ›" row on the main Settings screen instead of an always-visible control embedded there. */
export default function UnitsSettingsPage() {
  const t = useTranslation();
  const { units, setUnits } = useUnitsContext();

  return (
    <Screen>
      <BackHeader title={t.settingsPage.units} fallbackHref="/settings" />
      <Card>
        <SegmentedControl
          value={units}
          onChange={(u) => setUnits(u as UnitSystem)}
          options={[
            { value: "metric", label: t.settingsPage.unitsMetric },
            { value: "imperial", label: t.settingsPage.unitsImperial },
          ]}
        />
      </Card>
    </Screen>
  );
}
