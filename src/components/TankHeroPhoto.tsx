"use client";

import { useEffect, useState } from "react";
import { readPhotoFile } from "@/lib/opfs-files";

/**
 * Full-bleed photographic backdrop for the Tanks home header — the one
 * technique docs/07-design-brief.md calls the biggest lever for the
 * "expensive" feel ("glassmorphism needs something rich behind it to
 * blur, not a flat colour"). Uses the most recently photographed tank's
 * own photo when one exists; falls back to a bundled species photo
 * (already shipped for the Dex) so first-run users still get real
 * photography, not a gradient.
 */
export function TankHeroPhoto({ photoUri, children }: { photoUri?: string | null; children: React.ReactNode }) {
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

  const imageSrc = url ?? "/species/betta.jpg";

  return (
    <div
      style={{
        position: "relative",
        margin: "calc(var(--space-lg) * -1) calc(var(--space-lg) * -1) var(--space-xl)",
        height: 200,
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
          // Light duotone toward navy so photography sourced from many
          // retailers reads as one consistent material, per the brief.
          filter: "saturate(0.75) brightness(0.8) sepia(0.15) hue-rotate(165deg)",
          transform: "scale(1.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(2,16,36,0.35) 0%, rgba(2,16,36,0.55) 55%, var(--color-ground) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          height: "100%",
          padding: "var(--space-xl) var(--space-lg) 0",
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
