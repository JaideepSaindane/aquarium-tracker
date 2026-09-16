"use client";

import { use } from "react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { GalleryPanel } from "@/components/GalleryPanel";
import { useLiveQuery } from "@/db/live";
import { MissingRecord } from "@/components/MissingRecord";
import { getTank } from "@/db/queries/tanks";
import { useTranslation } from "@/i18n/use-translation";

export default function TankGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslation();
  const { data: tank, loading: recordLoading, error: recordError } = useLiveQuery(() => getTank(id), [id]);

  if (!tank) return <MissingRecord kind="tank" loading={recordLoading} error={recordError} />;

  return (
    <Screen>
      <BackHeader title={t.galleryPage.title} fallbackHref={`/tank/${id}`} />
      <GalleryPanel tankId={id} />
    </Screen>
  );
}
