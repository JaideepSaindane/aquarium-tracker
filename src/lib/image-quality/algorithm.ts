// Pure, DOM-free pixel math shared between the browser (src/lib/image-quality/browser.ts,
// fed from Canvas ImageData) and the Node tuning script (scripts/tune-quality-thresholds.mjs,
// fed from `sharp`). One implementation, two callers — so the thresholds tuned
// against real photos in T-002's set are the exact thresholds running in the app.
// See specs/T-014-camera-quality-gate.md.

export type QualityIssue = "blurry" | "too_dark" | "blown_out" | "glare" | "too_far";

export type QualityReport = {
  usable: boolean;
  issues: QualityIssue[];
  metrics: { blurVariance: number; meanBrightness: number; glareFraction: number; darkFraction: number; detailFraction: number };
};

// Tuned against the 25 real photos in tank-scan-harness/eval/photos PLUS
// synthetic test cases (scripts/tune-quality-thresholds.mjs and
// scripts/_synthetic-quality-check.mjs) — the real set alone had no
// genuinely out-of-focus photo to calibrate blur against, so an initial
// guess of 25 for blurVarianceMin turned out to barely catch even a heavily
// blurred (sigma=15) synthetic test image (scored 28.7) — it was
// effectively a no-op. Real sharp photos in the set scored 412-2457.
// Revisit these once real usage data exists; frame-fill in particular is a
// weak proxy without real object detection (see detailFraction below).
export const THRESHOLDS = {
  blurVarianceMin: 150, // below this, the image is likely out of focus
  brightnessDarkMax: 42, // mean brightness (0-255) below this = too dark
  brightnessBlownMin: 235, // mean brightness above this = blown out / overexposed
  glareFractionMax: 0.12, // fraction of near-white pixels above this = flash glare off the glass
  detailFractionMin: 0.04, // fraction of the frame with real detail below this = likely too far / mostly blank wall
};

export function toGrayscale(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; p < gray.length; i += 4, p++) {
    // standard luma weights
    gray[p] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  return gray;
}

/** Variance of the Laplacian — the standard, cheap blur-detection proxy. Low variance = few sharp edges = blurry. */
export function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  const lap = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const value =
        -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - width] + gray[idx + width];
      lap[idx] = value;
    }
  }
  let mean = 0;
  for (let i = 0; i < lap.length; i++) mean += lap[i];
  mean /= lap.length;
  let variance = 0;
  for (let i = 0; i < lap.length; i++) variance += (lap[i] - mean) ** 2;
  return variance / lap.length;
}

export function meanBrightness(gray: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  return sum / gray.length;
}

/** Fraction of near-white pixels — a proxy for flash/lamp glare reflecting off the front glass. */
export function glareFraction(gray: Float32Array, threshold = 245): number {
  let count = 0;
  for (let i = 0; i < gray.length; i++) if (gray[i] >= threshold) count++;
  return count / gray.length;
}

export function darkFraction(gray: Float32Array, threshold = 20): number {
  let count = 0;
  for (let i = 0; i < gray.length; i++) if (gray[i] <= threshold) count++;
  return count / gray.length;
}

/**
 * Weak proxy for "frame fill" (does the tank occupy enough of the photo):
 * the fraction of pixels with meaningfully different brightness from their
 * neighbour, i.e. real visual detail rather than a flat wall/background.
 * No real object detection here — see THRESHOLDS comment. Deliberately
 * lenient: a false rejection here costs a user their photo for a weak
 * signal, which is a worse trade than the other three checks.
 */
export function detailFraction(gray: Float32Array, width: number, height: number, edgeThreshold = 12): number {
  let count = 0;
  let total = 0;
  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const idx = y * width + x;
      const dx = Math.abs(gray[idx] - gray[idx - 1]);
      const dy = Math.abs(gray[idx] - gray[idx - width]);
      if (dx > edgeThreshold || dy > edgeThreshold) count++;
      total++;
    }
  }
  return count / total;
}

export function assessQuality(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): QualityReport {
  const gray = toGrayscale(rgba, width, height);
  const blurVariance = laplacianVariance(gray, width, height);
  const brightness = meanBrightness(gray);
  const glare = glareFraction(gray);
  const dark = darkFraction(gray);
  const detail = detailFraction(gray, width, height);

  const issues: QualityIssue[] = [];
  if (blurVariance < THRESHOLDS.blurVarianceMin) issues.push("blurry");
  if (brightness < THRESHOLDS.brightnessDarkMax) issues.push("too_dark");
  if (brightness > THRESHOLDS.brightnessBlownMin) issues.push("blown_out");
  if (glare > THRESHOLDS.glareFractionMax) issues.push("glare");
  if (detail < THRESHOLDS.detailFractionMin) issues.push("too_far");

  return {
    usable: issues.length === 0,
    issues,
    metrics: { blurVariance, meanBrightness: brightness, glareFraction: glare, darkFraction: dark, detailFraction: detail },
  };
}

export const ISSUE_MESSAGES: Record<QualityIssue, string> = {
  blurry: "This photo looks blurry — hold the phone steady and let the camera focus before capturing.",
  too_dark: "Too dark to see the tank clearly — turn on a light near the tank (but not a direct flash).",
  blown_out: "This photo is overexposed/too bright — turn off the flash and reduce direct light on the glass.",
  glare: "Too much glare — try turning off the room light and shooting straight through the front glass.",
  too_far: "The tank doesn't fill enough of the frame — move closer or zoom in on the tank.",
};
