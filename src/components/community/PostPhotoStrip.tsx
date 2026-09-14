"use client";

import { useState } from "react";
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
export function PostPhotoStrip({ photoUris }: { photoUris: string[] }) {
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  if (photoUris.length === 0) return null;

  return (
    <>
      {viewerSrc && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}

      {photoUris.length === 1 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUris[0]}
          alt=""
          onClick={() => setViewerSrc(photoUris[0])}
          style={{ width: "100%", borderRadius: "var(--radius-md)", marginTop: 8, display: "block", cursor: "pointer" }}
        />
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={uri}
              alt=""
              onClick={() => setViewerSrc(uri)}
              style={{
                width: "80%",
                maxWidth: 320,
                aspectRatio: "4 / 3",
                objectFit: "cover",
                borderRadius: "var(--radius-md)",
                flexShrink: 0,
                scrollSnapAlign: "start",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
