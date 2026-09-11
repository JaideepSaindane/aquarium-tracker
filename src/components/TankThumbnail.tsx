"use client";

import { usePhotoSrc } from "@/lib/use-photo-src";

/**
 * Photo thumbnail for a tank card — `photoUri` can be a real https Blob URL
 * or a legacy OPFS-relative path, both handled by usePhotoSrc. Falls back
 * to an emoji placeholder when there's no photo yet. Square by default
 * (`size`); pass `width`/`height` for a wide, photo-led card layout instead
 * (2026-09-10 Tanks-screen redesign) — `size` still wins for existing
 * square callers.
 */
export function TankThumbnail({
  photoUri,
  size = 56,
  width,
  height,
  radius = "var(--radius-md, 8px)",
}: {
  photoUri?: string | null;
  size?: number;
  width?: number | string;
  height?: number | string;
  radius?: string;
}) {
  const url = usePhotoSrc(photoUri);

  return (
    <div
      style={{
        width: width ?? size,
        height: height ?? size,
        borderRadius: radius,
        background: "var(--color-surface-alt, #eee)",
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
