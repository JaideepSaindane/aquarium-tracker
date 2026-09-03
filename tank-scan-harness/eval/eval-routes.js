// Routes backing public/eval.html and public/eval-review.html — the "tiny
// local web form" specs/T-002 asks for, so Jaideep never hand-writes JSON.
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getSpeciesList, runScan, PROMPT_VERSION } from "../scan-core.js";
import { PHOTOS_DIR, GT_DIR, RESULTS_DIR, JUDGMENTS_DIR, loadPhotoStatus, computeSummary } from "./scoring.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return null;
  }
}

export function registerEvalRoutes(app) {
  app.use("/eval/photos", express.static(PHOTOS_DIR));

  // List every photo in eval/photos with its ground-truth / result / judgment status.
  app.get("/api/eval/photos", async (req, res) => {
    res.json(await loadPhotoStatus());
  });

  // Species list, for the ground-truth form's species picker.
  app.get("/api/eval/species", async (req, res) => {
    const list = await getSpeciesList();
    res.json(list.map((s) => ({ id: s.id, name: s.common_names?.[0] ?? s.id })));
  });

  app.get("/api/eval/ground-truth/:stem", async (req, res) => {
    const gt = await readJsonIfExists(path.join(GT_DIR, `${req.params.stem}.json`));
    res.json(gt || null);
  });

  app.post("/api/eval/ground-truth/:stem", async (req, res) => {
    await fs.mkdir(GT_DIR, { recursive: true });
    await fs.writeFile(path.join(GT_DIR, `${req.params.stem}.json`), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  });

  app.get("/api/eval/result/:stem", async (req, res) => {
    const result = await readJsonIfExists(path.join(RESULTS_DIR, `${req.params.stem}.json`));
    res.json(result || null);
  });

  app.get("/api/eval/judgment/:stem", async (req, res) => {
    const j = await readJsonIfExists(path.join(JUDGMENTS_DIR, `${req.params.stem}.json`));
    res.json(j || null);
  });

  app.post("/api/eval/judgment/:stem", async (req, res) => {
    await fs.mkdir(JUDGMENTS_DIR, { recursive: true });
    await fs.writeFile(path.join(JUDGMENTS_DIR, `${req.params.stem}.json`), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  });

  // Run (or re-run) the scan for a single photo, using its saved ground truth
  // for dimensions/city. Used by the "Run scan" button on eval.html.
  app.post("/api/eval/run/:stem", async (req, res) => {
    const stem = req.params.stem;
    const gt = await readJsonIfExists(path.join(GT_DIR, `${stem}.json`));
    if (!gt) {
      return res.status(400).json({ error: "Enter ground truth (dimensions at least) before running a scan." });
    }
    const photos = await fs.readdir(PHOTOS_DIR);
    const filename = photos.find((f) => f.replace(/\.[^.]+$/, "") === stem);
    if (!filename) return res.status(404).json({ error: "Photo file not found." });

    const imageBuffer = await fs.readFile(path.join(PHOTOS_DIR, filename));
    const result = await runScan({
      imageBuffer,
      length: gt.length_cm,
      width: gt.width_cm,
      height: gt.height_cm,
      city: gt.city,
    });
    const record = { savedAt: new Date().toISOString(), promptVersion: PROMPT_VERSION, ...result };
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    await fs.writeFile(path.join(RESULTS_DIR, `${stem}.json`), JSON.stringify(record, null, 2));
    res.json(record);
  });

  app.get("/api/eval/summary", async (req, res) => {
    res.json(await computeSummary());
  });
}
