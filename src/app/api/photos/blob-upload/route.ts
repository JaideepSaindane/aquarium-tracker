import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUserId } from "@/server/auth/require-user";

// Real photo storage on Vercel Blob (2026-09-11) — replaces writing straight
// to the browser's local OPFS for anything that needs to follow an account
// across devices (see src/lib/photo-upload.ts, the client-side helper every
// "add a photo" screen calls now instead of src/lib/opfs-files.ts's
// writePhotoFile). The store is public (unguessable random URL per file,
// not access-controlled) — a deliberate simplicity/privacy tradeoff flagged
// to Jaideep rather than silently chosen; revisit with a private store +
// signed read URLs if that tradeoff ever needs to change.
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo is too large." }, { status: 400 });

  const ext = file.type === "image/png" ? "png" : "jpg";
  const pathname = `users/${userId}/${crypto.randomUUID()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });

  return NextResponse.json({ url: blob.url });
}
