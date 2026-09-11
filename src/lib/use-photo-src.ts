"use client";

import { useEffect, useState } from "react";
import { readPhotoFile } from "./opfs-files";

// A photo field (tank.photoUri, a photos.localUri row, etc.) can now hold
// either a real https Vercel Blob URL (anything written after the
// 2026-09-11 photo-storage migration — see photo-upload.ts) or an
// OPFS-relative path (anything written before it, or by the 9 tables not
// yet migrated) — both forms exist in the wild at once, so every render
// spot needs to handle both rather than assuming one. A Blob URL is used
// directly; an OPFS path still goes through the existing read-then-
// object-URL dance.
export function isRemotePhotoUrl(uri: string | null | undefined): boolean {
  return !!uri && /^https?:\/\//.test(uri);
}

/** Resolves a photoUri (either form) to a src usable directly in <img src>. */
export function usePhotoSrc(uri: string | null | undefined): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    // Nothing to do for an empty uri or a real https URL — the render
    // below uses `uri` directly in that case, never `objectUrl`, so there's
    // no stale value to clear.
    if (!uri || isRemotePhotoUrl(uri)) return;
    let revoked = "";
    readPhotoFile(uri).then((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      revoked = url;
      setObjectUrl(url);
    });
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [uri]);

  if (!uri) return null;
  return isRemotePhotoUrl(uri) ? uri : objectUrl;
}
