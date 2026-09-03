"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isOnboardingComplete, stampInstalledAtIfMissing } from "@/db/queries/settings";

/**
 * "From first launch, the stage picker appears immediately" (specs/T-023,
 * acceptance criterion 1) and "does not appear again on the next launch"
 * (criterion 9). Lives inside the tabs layout so it runs once the DB is
 * already booted (DbBootProvider wraps everything above this) — checked
 * exactly once per app load, not on every tab switch.
 */
export function OnboardingGate() {
  const router = useRouter();

  useEffect(() => {
    stampInstalledAtIfMissing();
    isOnboardingComplete().then((done) => {
      if (!done) router.replace("/onboarding");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
