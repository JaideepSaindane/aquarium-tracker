"use client";

import { useState } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { useLiveQuery } from "@/db/live";
import { addPhoto, listPhotosForTank } from "@/db/queries/photos";
import { uploadPhoto } from "@/lib/photo-upload";

/** The tank's photo grid plus a real "add a photo" action — shared between the dedicated Gallery page and the tank overview's inline collapsed section. */
export function GalleryPanel({ tankId }: { tankId: string }) {
  const { data: photos } = useLiveQuery(() => listPhotosForTank(tankId), [tankId]);
  const [uploading, setUploading] = useState(false);

  async function handleAddPhoto(file: File) {
    setUploading(true);
    try {
      // Uploads to Vercel Blob (2026-09-11), not OPFS — see
      // src/lib/photo-upload.ts.
      const url = await uploadPhoto(file);
      await addPhoto({ tankId, localUri: url, caption: "Gallery photo" });
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
