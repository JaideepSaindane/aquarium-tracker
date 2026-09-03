"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { JournalPanel } from "@/components/JournalPanel";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";

export default function TankJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);

  if (!tank) return <Screen>Loading...</Screen>;

  return (
    <Screen>
      <BackHeader title="Journal" fallbackHref={`/tank/${id}`} />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>{tank.name}</p>

      <JournalPanel tankId={id} autoOpenNew={searchParams.get("add") === "1"} />
    </Screen>
  );
}
