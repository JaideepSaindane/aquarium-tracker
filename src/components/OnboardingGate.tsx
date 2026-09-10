"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { stampInstalledAtIfMissing } from "@/db/queries/settings";
import { getProfile } from "@/db/queries/profile";

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
 */
export function OnboardingGate() {
  const router = useRouter();

  useEffect(() => {
    stampInstalledAtIfMissing();
    getProfile().then((profile) => {
      if (!profile?.onboardingCompletedAt) router.replace("/onboarding");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
