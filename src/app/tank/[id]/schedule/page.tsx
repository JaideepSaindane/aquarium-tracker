"use client";

import { use } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { RemindersPanel } from "@/components/RemindersPanel";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";

export default function TankSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);

  if (!tank) return <Screen>Loading...</Screen>;

  return (
    <Screen>
      <BackHeader title="Reminders" fallbackHref={`/tank/${id}`} />
      <p style={{ color: "var(--color-ink-muted)", marginBottom: 16 }}>{tank.name}</p>

      <RemindersPanel tankId={id} />
    </Screen>
  );
}
