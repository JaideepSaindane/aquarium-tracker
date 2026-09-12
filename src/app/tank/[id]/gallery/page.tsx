"use client";

import { use } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { GalleryPanel } from "@/components/GalleryPanel";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";
import { useTranslation } from "@/i18n/use-translation";

export default function TankGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslation();
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);

  if (!tank) return <Screen>{t.common.loading}</Screen>;

  return (
    <Screen>
      <BackHeader title={t.galleryPage.title} fallbackHref={`/tank/${id}`} />
      <GalleryPanel tankId={id} />
    </Screen>
  );
}
