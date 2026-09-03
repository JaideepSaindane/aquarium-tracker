"use client";

import { useEffect, useState } from "react";
import { PhotoViewer } from "@/components/PhotoViewer";
import { readPhotoFile } from "@/lib/opfs-files";
import { isoToLocalDateInput } from "@/lib/schedule";

export function GalleryGrid({ photos }: { photos: { id: string; localUri: string; takenAt: string | null }[] }) {
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>No photos in this tank yet. Add one from a journal entry.</p>
      </div>
    );
  }

  // Group by local calendar day, not by slicing the UTC ISO string — that
  // was the same UTC-vs-local-midnight bug already fixed elsewhere in this
  // codebase (`isoToLocalDateInput`), caught again live here: a photo taken
  // "today" was grouping under "yesterday" for anyone west of UTC.
  const byDate = new Map<string, typeof photos>();
  for (const p of photos) {
    const day = p.takenAt ? isoToLocalDateInput(p.takenAt) : "Undated";
    const list = byDate.get(day) ?? [];
    list.push(p);
    byDate.set(day, list);
  }

  return (
    <div>
      {viewerSrc && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}
      {Array.from(byDate.entries()).map(([day, dayPhotos]) => (
        <div key={day} style={{ marginBottom: 16 }}>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 8 }}>
            {day === "Undated"
              ? day
              : (() => {
                  const [y, m, d] = day.split("-").map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
                })()}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {dayPhotos.map((p) => (
              <GalleryThumb key={p.id} localUri={p.localUri} onOpen={setViewerSrc} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GalleryThumb({ localUri, onOpen }: { localUri: string; onOpen: (src: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    readPhotoFile(localUri).then((blob) => {
      if (blob && !cancelled) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [localUri]);

  if (!url) return <div style={{ aspectRatio: "1", background: "var(--color-surface-muted, #eee)", borderRadius: 8 }} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onClick={() => onOpen(url)}
      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, cursor: "pointer" }}
    />
  );
}
