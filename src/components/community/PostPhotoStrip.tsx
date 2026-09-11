"use client";

/**
 * A post's photos (2026-09-11, Jaideep: "add more photos so we can put
 * multiple photos... allow scrolling on the side, left to right, within
 * that grid itself"). One photo renders full-width as before; 2+ render as
 * a horizontally-scrollable, snap-to-photo strip so people can swipe
 * through them without the card growing tall.
 */
export function PostPhotoStrip({ photoUris }: { photoUris: string[] }) {
  if (photoUris.length === 0) return null;

  if (photoUris.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUris[0]} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)", marginTop: 8, display: "block" }} />
    );
  }

  return (
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
          style={{
            width: "80%",
            maxWidth: 320,
            aspectRatio: "4 / 3",
            objectFit: "cover",
            borderRadius: "var(--radius-md)",
            flexShrink: 0,
            scrollSnapAlign: "start",
          }}
        />
      ))}
    </div>
  );
}
