"use client";

import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Honest placeholder for the guided setup planner (T-027 — not built yet).
 * Replaces the old dead "I'm thinking about getting fish" card, which had
 * no tap handler at all and silently did nothing (a real, previously-found
 * dead end). This is a real destination now, and says plainly that the
 * guided version isn't built, rather than pretending it exists.
 */
export default function OnboardingPlannerPage() {
  const router = useRouter();
  const t = useTranslation();

  return (
    <Screen>
      <BackHeader title={t.onboarding.plannerTitle} fallbackHref="/" />

      <Card style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}>{t.onboarding.plannerBody}</p>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <PrimaryButton onClick={() => router.push("/onboarding/scan")}>Already have a tank? Add it here instead</PrimaryButton>
        <SecondaryButton onClick={() => router.push("/")}>Back to My Tanks</SecondaryButton>
      </div>
    </Screen>
  );
}
