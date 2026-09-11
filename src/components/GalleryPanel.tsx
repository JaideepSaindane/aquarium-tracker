"use client";

import { useState } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { Banner } from "@/components/Banner";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { useLiveQuery } from "@/db/live";
import { addPhoto, listPhotosForTank } from "@/db/queries/photos";
import { uploadPhoto } from "@/lib/photo-upload";

/** The tank's photo grid plus a real "add a photo" action — shared between the dedicated Gallery page and the tank overview's inline collapsed section. */
export function GalleryPanel({ tankId }: { tankId: string }) {
  const { data: photos } = useLiveQuery(() => listPhotosForTank(tankId), [tankId]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      // Uploads to Vercel Blob (2026-09-11), not OPFS — see
      // src/lib/photo-upload.ts.
      const url = await uploadPhoto(file);
      await addPhoto({ tankId, localUri: url, caption: "Gallery photo" });
    } catch {
      setError("Couldn't upload that photo — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <PhotoPickerButton label={uploading ? "Adding..." : "+ Add photo"} onPick={handleAddPhoto} />
        {error && (
          <div style={{ marginTop: 8 }}>
            <Banner severity="watch">{error}</Banner>
          </div>
        )}
      </div>
      <GalleryGrid photos={photos ?? []} />
    </div>
  );
}
