import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireUserId } from "@/server/auth/require-user";

// Video support (2026-09-14, Jaideep: "add vid support"). Videos are too big
// for the existing `/api/photos/blob-upload` route: that route reads the
// whole file into the serverless function's request body first, and Vercel
// caps that around 4.5MB — fine for a photo, hopeless for real video. This
// route instead hands the browser a short-lived, scoped token so the video
// uploads straight from the phone to Vercel Blob, never passing through our
// server. Photos keep using the old route unchanged.
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/x-m4v"],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: false,
          pathname: `users/${userId}/${crypto.randomUUID()}-${pathname.split("/").pop() ?? "video"}`,
        };
      },
      onUploadCompleted: async () => {
        // No server-side bookkeeping needed — the returned URL is saved by
        // the client into the post the same way a photo URL is.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
