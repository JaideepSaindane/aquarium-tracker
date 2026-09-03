"use client";

// Generic OPFS file storage for photos — separate from the SQLite database
// file (which lives in its own OPFS-SAHPool-managed space, see
// src/db/client.ts). Photos live under /photos/<uuid>.<ext> in the origin's
// private filesystem; the `photos` table's `local_uri` column stores that
// relative path. No capture flow exists yet (T-014) — this is the storage
// primitive later tasks build on.
const PHOTOS_DIR = "photos";

async function getPhotosDir(create = true): Promise<FileSystemDirectoryHandle | null> {
  if (!("storage" in navigator) || !("getDirectory" in navigator.storage)) return null;
  const root = await navigator.storage.getDirectory();
  try {
    return await root.getDirectoryHandle(PHOTOS_DIR, { create });
  } catch {
    return null;
  }
}

// getFileHandle()/getDirectoryHandle() only accept a single path segment —
// no slashes — so a nested relative path like "test-data/photo-0.jpg" has
// to be walked one directory at a time. Discovered live: this threw
// "Name is not allowed" the first time a nested path was tried.
async function resolveDir(root: FileSystemDirectoryHandle, segments: string[], create: boolean): Promise<FileSystemDirectoryHandle> {
  let dir = root;
  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment, { create });
  }
  return dir;
}

export async function writePhotoFile(relativePath: string, blob: Blob): Promise<void> {
  const photosDir = await getPhotosDir(true);
  if (!photosDir) throw new Error("OPFS is not available in this browser");
  const parts = relativePath.split("/");
  const filename = parts.pop()!;
  const dir = await resolveDir(photosDir, parts, true);
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function readPhotoFile(relativePath: string): Promise<Blob | null> {
  const photosDir = await getPhotosDir(false);
  if (!photosDir) return null;
  try {
    const parts = relativePath.split("/");
    const filename = parts.pop()!;
    const dir = await resolveDir(photosDir, parts, false);
    const fileHandle = await dir.getFileHandle(filename, { create: false });
    return await fileHandle.getFile();
  } catch {
    return null; // missing file — export must degrade gracefully, not throw
  }
}

export async function deletePhotoFile(relativePath: string): Promise<void> {
  const photosDir = await getPhotosDir(false);
  if (!photosDir) return;
  try {
    const parts = relativePath.split("/");
    const filename = parts.pop()!;
    const dir = await resolveDir(photosDir, parts, false);
    await dir.removeEntry(filename);
  } catch {
    // already gone — fine
  }
}
