"use client";

import { use } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { GalleryPanel } from "@/components/GalleryPanel";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";

export default function TankGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);

  if (!tank) return <Screen>Loading...</Screen>;

  return (
    <Screen>
      <BackHeader title="Gallery" fallbackHref={`/tank/${id}`} />
      <GalleryPanel tankId={id} />
    </Screen>
  );
}
