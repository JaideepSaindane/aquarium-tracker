// Runs the exact same algorithm.ts functions the browser uses (via tsx,
// which lets this .mjs script import .ts directly) against the 25 real
// photos in tank-scan-harness/eval/photos, to sanity-check the thresholds
// in src/lib/image-quality/algorithm.ts before trusting them in the app.
// See specs/T-014-camera-quality-gate.md "Notes for Claude Code."
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessQuality, THRESHOLDS } from "../src/lib/image-quality/algorithm.ts";

const root = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.join(root, "..", "tank-scan-harness", "eval", "photos");

async function main() {
  const files = (await fs.readdir(photosDir)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  if (files.length === 0) {
    console.log(`No photos found in ${photosDir}.`);
    return;
  }

  console.log(`Thresholds:`, THRESHOLDS);
  console.log("");
  console.log("file".padEnd(8), "usable".padEnd(8), "issues".padEnd(30), "blur".padEnd(10), "bright".padEnd(8), "glare".padEnd(8), "detail");

  let usableCount = 0;
  for (const file of files) {
    const image = sharp(path.join(photosDir, file)).resize({ width: 512, height: 512, fit: "inside" }).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const report = assessQuality(data, info.width, info.height);
    if (report.usable) usableCount++;
    console.log(
      file.padEnd(8),
      String(report.usable).padEnd(8),
      (report.issues.join(",") || "-").padEnd(30),
      report.metrics.blurVariance.toFixed(1).padEnd(10),
      report.metrics.meanBrightness.toFixed(1).padEnd(8),
      report.metrics.glareFraction.toFixed(3).padEnd(8),
      report.metrics.detailFraction.toFixed(3)
    );
  }

  console.log("");
  console.log(`${usableCount}/${files.length} passed the gate.`);
  console.log(`Cross-reference against tank-scan-harness/eval/ground-truth/*.json "problems" notes to judge false-rejection rate by eye.`);
}

main();
