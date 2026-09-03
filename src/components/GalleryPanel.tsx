"use client";

import { useState } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { useLiveQuery } from "@/db/live";
import { addPhoto, listPhotosForTank } from "@/db/queries/photos";
import { writePhotoFile } from "@/lib/opfs-files";
import { newId } from "@/db/id";

/** The tank's photo grid plus a real "add a photo" action — shared between the dedicated Gallery page and the tank overview's inline collapsed section. */
export function GalleryPanel({ tankId }: { tankId: string }) {
  const { data: photos } = useLiveQuery(() => listPhotosForTank(tankId), [tankId]);
  const [uploading, setUploading] = useState(false);

  async function handleAddPhoto(file: File) {
    setUploading(true);
    try {
      const path = `tanks/${tankId}-gallery-${newId()}.jpg`;
      await writePhotoFile(path, file);
      await addPhoto({ tankId, localUri: path, caption: "Gallery photo" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <PhotoPickerButton label={uploading ? "Adding..." : "+ Add photo"} onPick={handleAddPhoto} />
      </div>
      <GalleryGrid photos={photos ?? []} />
    </div>
  );
}
