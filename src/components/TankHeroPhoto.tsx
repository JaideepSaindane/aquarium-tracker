"use client";

import { usePhotoSrc } from "@/lib/use-photo-src";

/**
 * Compact photographic backdrop for the Tanks home header. Uses the most
 * recently photographed tank's own photo when one exists; falls back to a
 * bundled species photo (already shipped for the Dex) so first-run users
 * still get real photography, not a gradient. Shrunk from a 200px "hero
 * dashboard" to a quieter 120px greeting strip 2026-09-10, per Jaideep's
 * "make it a greeting, not a dashboard" direction — the app's colour is
 * meant to come from aquarium content like this photo, not from painting
 * the chrome itself blue, so the duotone here is now neutral/teal instead
 * of the old navy tint.
 */
export function TankHeroPhoto({ photoUri, children }: { photoUri?: string | null; children: React.ReactNode }) {
  const url = usePhotoSrc(photoUri);
  const imageSrc = url ?? "/species/betta.jpg";

  return (
    <div
      style={{
        position: "relative",
        margin: "calc(var(--space-lg) * -1) calc(var(--space-lg) * -1) var(--space-xl)",
        height: 120,
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Light duotone toward the app's neutral charcoal/teal ink so
          // photography sourced from many retailers reads as one
          // consistent material, without painting it navy-blue.
          filter: "saturate(0.85) brightness(0.85) sepia(0.1) hue-rotate(130deg)",
          transform: "scale(1.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(24,36,43,0.3) 0%, rgba(24,36,43,0.5) 55%, var(--color-ground) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          height: "100%",
          padding: "var(--space-lg) var(--space-lg) 0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        {children}
      </div>
    </div>
  );
}
