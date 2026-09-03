"use client";

import { assessQuality, type QualityReport } from "./algorithm";

// Matches the resolution used in scripts/tune-quality-thresholds.mjs — the
// thresholds were calibrated at this size, so analysis must run at the same
// scale or the metrics won't mean what they were tuned to mean.
const ANALYSIS_MAX_DIM = 512;
const UPLOAD_MAX_DIM = 1024;

async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  // imageOrientation: "from-image" — respects EXIF rotation, which phone
  // cameras set constantly. Without this, portrait photos come out sideways.
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function drawToCanvas(bitmap: ImageBitmap, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

export async function assessPhotoQuality(file: File): Promise<QualityReport> {
  const bitmap = await bitmapFromFile(file);
  try {
    const canvas = drawToCanvas(bitmap, ANALYSIS_MAX_DIM);
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return assessQuality(imageData.data, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
}

/** ~1024px longest edge, per specs/T-014 — this is what gets uploaded/sent to AI, never the original. */
export async function downscaleForUpload(file: File, maxDim = UPLOAD_MAX_DIM, quality = 0.85): Promise<Blob> {
  const bitmap = await bitmapFromFile(file);
  try {
    const canvas = drawToCanvas(bitmap, maxDim);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", quality);
    });
  } finally {
    bitmap.close();
  }
}
