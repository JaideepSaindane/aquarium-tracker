"use client";

import { useEffect, useState } from "react";
import { readPhotoFile } from "@/lib/opfs-files";

/** Small square photo thumbnail for a tank card, loaded from OPFS. Falls back to an emoji placeholder when there's no photo yet. */
export function TankThumbnail({ photoUri, size = 56 }: { photoUri?: string | null; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      if (!photoUri) return;
      const blob = await readPhotoFile(photoUri);
      if (blob && !cancelled) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    }
    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoUri]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-md, 8px)",
        background: "var(--color-surface-muted, #eee)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span aria-hidden style={{ fontSize: size * 0.43 }}>
          🐟
        </span>
      )}
    </div>
  );
}
