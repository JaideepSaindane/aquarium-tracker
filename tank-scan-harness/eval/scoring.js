// T-002 scoring. Reads eval/photos + eval/ground-truth + eval/results +
// eval/judgments and produces the summary table docs/specs/T-002 asks for.
// Shared between the CLI script (npm run eval:score) and the /api/eval/summary
// route so the web review page and the terminal always agree.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PHOTOS_DIR = path.join(__dirname, "photos");
export const GT_DIR = path.join(__dirname, "ground-truth");
export const RESULTS_DIR = path.join(__dirname, "results");
export const JUDGMENTS_DIR = path.join(__dirname, "judgments");

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return null;
  }
}

export async function stemsWithPhotos() {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
  const files = await fs.readdir(PHOTOS_DIR);
  return files
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => ({ stem: f.replace(/\.[^.]+$/, ""), filename: f }))
    .sort((a, b) => a.stem.localeCompare(b.stem));
}

export async function loadPhotoStatus() {
  const photos = await stemsWithPhotos();
  const out = [];
  for (const { stem, filename } of photos) {
    const gt = await readJsonIfExists(path.join(GT_DIR, `${stem}.json`));
    const result = await readJsonIfExists(path.join(RESULTS_DIR, `${stem}.json`));
    const judgment = await readJsonIfExists(path.join(JUDGMENTS_DIR, `${stem}.json`));
    out.push({
      stem,
      filename,
      hasGroundTruth: !!gt,
      hasResult: !!result,
      resultOk: result ? result.ok !== false : null,
      hasJudgment: !!judgment,
    });
  }
  return out;
}

// Ground truth's `fish` array only tracks fish, not shrimp/snails (discovered
// 2026-08-31: this silently counted every correctly-spotted shrimp/snail as a
// "false positive" since it never appeared in gt.fish). Until ground truth
// gets its own invertebrates list, don't penalize these species_ids.
const INVERTEBRATE_SPECIES_IDS = new Set(["amano-shrimp", "cherry-shrimp", "nerite-snail", "mystery-snail"]);

function countAccuracyOk(trueCount, detected) {
  if (!detected) return false;
  const lo = (detected.count_min ?? detected.count_max ?? 0) - 1;
  const hi = (detected.count_max ?? detected.count_min ?? 0) + 1;
  return trueCount >= lo && trueCount <= hi;
}

export async function computeSummary() {
  const photos = await stemsWithPhotos();
  let gtFishTotal = 0,
    gtFishIdentified = 0,
    gtFishCountOk = 0,
    falsePositiveCount = 0,
    photosWithFalsePositive = 0,
    gtEquipmentTotal = 0,
    gtEquipmentDetected = 0,
    algaePhotosTotal = 0,
    algaeCorrect = 0,
    photosScored = 0,
    photosMissingGT = 0,
    photosMissingResult = 0,
    photosFailedResult = 0;
  let usefulnessSum = 0,
    usefulnessCount = 0,
    honestUncertaintyYes = 0,
    honestUncertaintyJudged = 0;

  const perPhoto = [];

  for (const { stem } of photos) {
    const gt = await readJsonIfExists(path.join(GT_DIR, `${stem}.json`));
    if (!gt) {
      photosMissingGT++;
      continue;
    }
    const resultRecord = await readJsonIfExists(path.join(RESULTS_DIR, `${stem}.json`));
    if (!resultRecord) {
      photosMissingResult++;
      continue;
    }
    if (resultRecord.ok === false) {
      photosFailedResult++;
      continue;
    }
    photosScored++;
    const report = resultRecord.report;
    const detectedLivestock = report.livestock || [];
    const gtSpeciesIds = new Set((gt.fish || []).map((f) => f.species_id).filter(Boolean));

    // Species identification + count accuracy, over ground-truth fish that
    // have a known species_id (i.e. identifiable at all).
    let photoFalsePositives = 0;
    for (const f of gt.fish || []) {
      if (!f.species_id) continue;
      gtFishTotal++;
      const match = detectedLivestock.find((l) => l.species_id === f.species_id);
      if (match) {
        gtFishIdentified++;
        if (countAccuracyOk(f.count, match)) gtFishCountOk++;
      }
    }
    // False positives: model named a species_id that isn't in ground truth at all.
    for (const l of detectedLivestock) {
      if (l.species_id && !gtSpeciesIds.has(l.species_id) && !INVERTEBRATE_SPECIES_IDS.has(l.species_id)) {
        falsePositiveCount++;
        photoFalsePositives++;
      }
    }
    if (photoFalsePositives > 0) photosWithFalsePositive++;

    // Equipment.
    const detectedEquipTypes = new Set((report.equipment_visible || []).map((e) => e.type));
    for (const type of gt.equipment || []) {
      gtEquipmentTotal++;
      if (detectedEquipTypes.has(type)) gtEquipmentDetected++;
    }

    // Algae type — compare ground truth's single primary type against the report's algae array.
    if (gt.algae?.type) {
      algaePhotosTotal++;
      const detectedTypes = new Set((report.algae || []).map((a) => a.type));
      const gtIsNone = gt.algae.type === "none";
      const detectedHasNone = detectedTypes.has("none") || detectedTypes.size === 0;
      if (gtIsNone ? detectedHasNone : detectedTypes.has(gt.algae.type)) {
        algaeCorrect++;
      }
    }

    // Judgment (subjective, entered by Jaideep on the review page).
    const judgment = await readJsonIfExists(path.join(JUDGMENTS_DIR, `${stem}.json`));
    if (judgment) {
      if (typeof judgment.usefulness === "number") {
        usefulnessSum += judgment.usefulness;
        usefulnessCount++;
      }
      if (typeof judgment.honestUncertainty === "boolean") {
        honestUncertaintyJudged++;
        if (judgment.honestUncertainty) honestUncertaintyYes++;
      }
    }

    perPhoto.push({ stem, falsePositives: photoFalsePositives });
  }

  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

  return {
    totals: {
      photosWithPhotoFile: photos.length,
      photosMissingGT,
      photosMissingResult,
      photosFailedResult,
      photosScored,
    },
    speciesIdentificationPct: pct(gtFishIdentified, gtFishTotal),
    speciesIdentification: { identified: gtFishIdentified, total: gtFishTotal },
    falsePositives: { totalNamed: falsePositiveCount, photosAffected: photosWithFalsePositive, photosScored },
    countAccuracyPct: pct(gtFishCountOk, gtFishIdentified),
    countAccuracy: { withinTolerance: gtFishCountOk, ofIdentified: gtFishIdentified },
    equipmentDetectionPct: pct(gtEquipmentDetected, gtEquipmentTotal),
    equipmentDetection: { detected: gtEquipmentDetected, total: gtEquipmentTotal },
    algaeTypePct: pct(algaeCorrect, algaePhotosTotal),
    algaeType: { correct: algaeCorrect, total: algaePhotosTotal },
    findingUsefulnessAvg: usefulnessCount > 0 ? Math.round((usefulnessSum / usefulnessCount) * 10) / 10 : null,
    findingUsefulness: { judged: usefulnessCount },
    honestUncertaintyPct: pct(honestUncertaintyYes, honestUncertaintyJudged),
    honestUncertainty: { yes: honestUncertaintyYes, judged: honestUncertaintyJudged },
    perPhoto,
  };
}

export function printSummary(summary) {
  const t = summary.totals;
  console.log("\n=== T-002 Tank Scan accuracy summary ===\n");
  console.log(`Photos with a file:        ${t.photosWithPhotoFile}`);
  console.log(`  missing ground truth:    ${t.photosMissingGT}`);
  console.log(`  missing a scan result:   ${t.photosMissingResult}`);
  console.log(`  scan failed validation:  ${t.photosFailedResult}`);
  console.log(`  scored:                  ${t.photosScored}\n`);

  const line = (label, pctVal, detail) =>
    console.log(`${label.padEnd(28)} ${pctVal === null ? "n/a".padStart(6) : (pctVal + "%").padStart(6)}   ${detail}`);

  line("Species identification", summary.speciesIdentificationPct, `${summary.speciesIdentification.identified}/${summary.speciesIdentification.total} named fish correctly identified`);
  console.log(
    `${"False positives".padEnd(28)} ${String(summary.falsePositives.totalNamed).padStart(6)}   species named that weren't there, across ${summary.falsePositives.photosAffected}/${summary.falsePositives.photosScored} photos — should be near zero`
  );
  line("Count accuracy (±1)", summary.countAccuracyPct, `${summary.countAccuracy.withinTolerance}/${summary.countAccuracy.ofIdentified} of correctly-identified species`);
  line("Equipment detection", summary.equipmentDetectionPct, `${summary.equipmentDetection.detected}/${summary.equipmentDetection.total} ground-truth equipment items found`);
  line("Algae type", summary.algaeTypePct, `${summary.algaeType.correct}/${summary.algaeType.total} photos classified correctly`);
  console.log(
    `${"Finding usefulness".padEnd(28)} ${summary.findingUsefulnessAvg === null ? "n/a".padStart(6) : String(summary.findingUsefulnessAvg).padStart(6)}   avg 1-5, ${summary.findingUsefulness.judged} photos judged so far`
  );
  line("Honest uncertainty", summary.honestUncertaintyPct, `${summary.honestUncertainty.yes}/${summary.honestUncertainty.judged} judged photos correctly flagged something undetermined`);

  console.log("\nThe gate (docs/specs/T-002-accuracy-evaluation.md): species ID above ~70% on decent photos, with false positives near zero.\n");
}
