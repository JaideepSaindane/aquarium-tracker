"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { JournalPanel } from "@/components/JournalPanel";
import { useLiveQuery } from "@/db/live";
import { MissingRecord } from "@/components/MissingRecord";
import { getTank } from "@/db/queries/tanks";
import { useTranslation } from "@/i18n/use-translation";

export default function TankJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslation();
  const searchParams = useSearchParams();
  const { data: tank, loading: recordLoading, error: recordError } = useLiveQuery(() => getTank(id), [id]);

  if (!tank) return <MissingRecord kind="tank" loading={recordLoading} error={recordError} />;

  return (
    <Screen>
      <BackHeader title={t.journalPage.title} fallbackHref={`/tank/${id}`} />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>{tank.name}</p>

      <JournalPanel tankId={id} autoOpenNew={searchParams.get("add") === "1"} />
    </Screen>
  );
}
