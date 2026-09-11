"use client";

import { usePhotoSrc } from "@/lib/use-photo-src";

/** Small circular avatar for a Community post/comment author — read-only (no picker), person-icon fallback. */
export function AuthorAvatar({ photoUri, size = 32 }: { photoUri?: string | null; size?: number }) {
  const url = usePhotoSrc(photoUri);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--color-surface-alt)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span aria-hidden style={{ fontSize: size * 0.5 }}>
          👤
        </span>
      )}
    </div>
  );
}
