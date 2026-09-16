"use client";

import { useRouter } from "next/navigation";
import { Screen } from "./Screen";
import { EmptyState } from "./EmptyState";
import { notifyChanged } from "@/db/live";
import { useTranslation } from "@/i18n/use-translation";

/**
 * What a detail page shows while its tank/species isn't in hand yet.
 *
 * Those pages used to render "Loading..." whenever the record was missing,
 * which can't tell three different situations apart — so a deleted tank
 * (e.g. delete it, then press Back) or a failed request showed "Loading..."
 * forever with nothing to tap (Jaideep, 2026-09-16: "check the entire app
 * for any dead-ends"). Now:
 *   - still loading → "Loading..." as before
 *   - the request failed → say so, with Try again
 *   - it doesn't exist → say so, with a way back to somewhere real
 */
export function MissingRecord({ kind, loading, error }: { kind: "tank" | "species"; loading: boolean; error: unknown }) {
  const t = useTranslation();
  const router = useRouter();
  const background = kind === "species" ? "var(--soft-bg)" : undefined;

  if (loading) return <Screen background={background}>{t.common.loading}</Screen>;

  if (error) {
    return (
      <Screen background={background}>
        <EmptyState icon="📡" message={`${t.common.couldNotLoad}. ${t.common.couldNotConnect}`} actionLabel={t.common.tryAgain} onAction={notifyChanged} />
      </Screen>
    );
  }

  return (
    <Screen background={background}>
      {kind === "tank" ? (
        <EmptyState icon="🐠" message={`${t.common.tankNotFound}. ${t.common.tankNotFoundBody}`} actionLabel={t.common.goToMyTanks} onAction={() => router.replace("/")} />
      ) : (
        <EmptyState icon="🔍" message={`${t.common.speciesNotFound}. ${t.common.speciesNotFoundBody}`} actionLabel={t.common.backToDex} onAction={() => router.replace("/dex")} />
      )}
    </Screen>
  );
}
