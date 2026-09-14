"use client";

// Real client-side video compression (2026-09-14, Jaideep: "can we compress
// these videos? I don't want to take up a lot of storage... I don't want it
// to [buffer] later also"), same spirit as the existing "downscale images to
// ~1024px before upload" rule in CLAUDE.md's AI section, just for community
// post videos. Runs ffmpeg compiled to WASM entirely in the browser — no
// server-side transcoder exists (Vercel's serverless functions don't ship
// ffmpeg), and ffmpeg.wasm's single-threaded @ffmpeg/core build was picked
// specifically because it needs no COOP/COEP cross-origin-isolation headers,
// unlike the faster multi-threaded @ffmpeg/core-mt build — this app sets no
// such headers today and adding them risks breaking other cross-origin
// resources, so single-threaded (slower, but works everywhere) is the right
// tradeoff here.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

const CORE_BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
// Cap the long edge the same way we cap photo uploads — most phone video is
// shot at 1080p+ and social-feed playback never needs more than this.
const MAX_HEIGHT = 720;
// A modest, phone-friendly target bitrate. Real content varies a lot, so
// this is a starting point tuned for "looks fine in a feed," not a precise
// budget — CRF-based encoding (below) does the real quality/size tradeoff.
const AUDIO_BITRATE = "96k";

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

/**
 * Re-encodes a video to a smaller H.264/AAC MP4 (capped at 720p tall,
 * CRF-compressed) entirely in the browser. Falls back to the original file
 * untouched if compression fails for any reason (unsupported format,
 * out-of-memory on a low-end phone, etc.) — a slightly bigger upload beats a
 * post that silently can't be made at all.
 */
export async function compressVideo(file: File, onProgress?: (ratio: number) => void): Promise<File> {
  try {
    const ffmpeg = await getFFmpeg();
    const unsubscribe = onProgress
      ? (() => {
          const handler = ({ progress }: { progress: number }) => onProgress(Math.min(1, Math.max(0, progress)));
          ffmpeg.on("progress", handler);
          return () => ffmpeg.off("progress", handler);
        })()
      : null;

    const inputName = "input" + (file.name.match(/\.\w+$/)?.[0] ?? ".mp4");
    const outputName = "output.mp4";
    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vf",
        `scale=-2:'min(${MAX_HEIGHT},ih)'`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "28",
        "-c:a",
        "aac",
        "-b:a",
        AUDIO_BITRATE,
        "-movflags",
        "+faststart",
        outputName,
      ]);
      const data = await ffmpeg.readFile(outputName);
      const bytes = data as Uint8Array;
      const compressed = new File([new Blob([new Uint8Array(bytes)])], file.name.replace(/\.\w+$/, "") + ".mp4", { type: "video/mp4" });
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
      // Only use the compressed result if it's actually smaller — a very
      // short/already-small clip can grow slightly under re-encoding.
      return compressed.size > 0 && compressed.size < file.size ? compressed : file;
    } finally {
      unsubscribe?.();
    }
  } catch {
    return file;
  }
}
