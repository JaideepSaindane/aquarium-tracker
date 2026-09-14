"use client";

import { useState, type CSSProperties } from "react";
import { PhotoViewer } from "@/components/PhotoViewer";

/**
 * A post's photos (2026-09-11, Jaideep: "add more photos so we can put
 * multiple photos... allow scrolling on the side, left to right, within
 * that grid itself"). One photo renders full-width as before; 2+ render as
 * a horizontally-scrollable, snap-to-photo strip so people can swipe
 * through them without the card growing tall.
 *
 * Tap-to-expand (2026-09-14, Jaideep: "I should be able to not just scroll
 * but also click on that photo, and it should expand. It is not happening
 * for any of the photos that are posted.") — same `PhotoViewer` full-screen
 * overlay (pinch-zoom/pan, back-button-aware) already used for tank gallery
 * photos, wired up the same way `GalleryGrid` does: one local "which URL is
 * open" state, `PhotoViewer` mounted conditionally.
 */
// Video support (2026-09-14, "add vid support"): a post's media array is
// still one flat list of URLs (no separate type column — see
// src/server/db/schema.ts's `photoUris`), so a video is told apart from a
// photo by its file extension, same as the upload step named it.
function isVideoUrl(uri: string): boolean {
  return /\.(mp4|mov|webm|m4v|3gp)(\?|$)/i.test(uri);
}

export function PostPhotoStrip({ photoUris }: { photoUris: string[] }) {
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  if (photoUris.length === 0) return null;

  function renderMedia(uri: string, style: CSSProperties) {
    if (isVideoUrl(uri)) {
      return <video src={uri} controls playsInline style={style} />;
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={uri} alt="" onClick={() => setViewerSrc(uri)} style={{ ...style, cursor: "pointer" }} />;
  }

  return (
    <>
      {viewerSrc && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}

      {photoUris.length === 1 ? (
        renderMedia(photoUris[0], { width: "100%", borderRadius: "var(--radius-md)", marginTop: 8, display: "block" })
      ) : (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            marginTop: 8,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {photoUris.map((uri, i) => (
            <div key={i} style={{ flexShrink: 0, scrollSnapAlign: "start" }}>
              {renderMedia(uri, {
                width: "min(80vw, 320px)",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                borderRadius: "var(--radius-md)",
                display: "block",
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
