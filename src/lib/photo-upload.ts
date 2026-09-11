"use client";

// Uploads a photo to the real server-side photo store (Vercel Blob) instead
// of writing it to the browser's local OPFS (src/lib/opfs-files.ts) —
// 2026-09-11, so photos follow a user's account across devices instead of
// being stuck on whichever phone/browser took them. Every "add a photo"
// call site that writes to the newly-migrated `photos`/tanks-avatar/
// equipment/plant/journal paths should call this instead of
// writePhotoFile(); OPFS itself isn't going away yet — the 9 tables still
// local-only (scans, species suggestions, etc.) keep using it until their
// own migration pass.
export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/photos/blob-upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Photo upload failed.");
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}
