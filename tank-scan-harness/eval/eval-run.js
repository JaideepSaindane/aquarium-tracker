// Run with: npm run eval:run
// Batch-runs every photo in eval/photos that has ground truth (so we know the
// dimensions/city to submit with) through the exact same scan-core.js code
// path server.js uses, and saves each result to eval/results/<stem>.json.
// Re-run after any prompt edit to compare prompt versions — see
// specs/T-002-accuracy-evaluation.md acceptance criterion 4.
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { runScan, PROMPT_VERSION } from "../scan-core.js";
import { stemsWithPhotos, PHOTOS_DIR, GT_DIR, RESULTS_DIR } from "./scoring.js";

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY — copy .env.example to .env first.");
    process.exit(1);
  }
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  const photos = await stemsWithPhotos();
  if (photos.length === 0) {
    console.log(`No photos found in ${PHOTOS_DIR}. Drop tank photos there first, then enter ground truth at /eval.html.`);
    return;
  }

  let ran = 0,
    skippedNoGT = 0,
    failed = 0;

  for (const { stem, filename } of photos) {
    const gt = await readJsonIfExists(path.join(GT_DIR, `${stem}.json`));
    if (!gt) {
      skippedNoGT++;
      console.log(`skip  ${stem} — no ground truth yet (enter it at /eval.html)`);
      continue;
    }
    process.stdout.write(`scan  ${stem} ... `);
    const imageBuffer = await fs.readFile(path.join(PHOTOS_DIR, filename));
    const result = await runScan({
      imageBuffer,
      length: gt.length_cm,
      width: gt.width_cm,
      height: gt.height_cm,
      city: gt.city,
    });
    const record = { savedAt: new Date().toISOString(), promptVersion: PROMPT_VERSION, ...result };
    await fs.writeFile(path.join(RESULTS_DIR, `${stem}.json`), JSON.stringify(record, null, 2));
    if (result.ok) {
      console.log(`ok (${result.meta.elapsedMs}ms, $${result.meta.costUsd.toFixed(6)})`);
      ran++;
    } else {
      console.log(`FAILED — ${result.error}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ran} scanned, ${failed} failed validation, ${skippedNoGT} skipped (no ground truth).`);
  console.log(`Run "npm run eval:score" for the summary table.`);
}

main();
