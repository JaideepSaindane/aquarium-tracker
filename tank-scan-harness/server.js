import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runScan, loadSpeciesContext, PROMPT_VERSION } from "./scan-core.js";
import { registerEvalRoutes } from "./eval/eval-routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "\nMissing GEMINI_API_KEY. Copy .env.example to .env and put your key in it.\n" +
      "Get one at https://aistudio.google.com — use a PAID key, not the free tier.\n"
  );
  process.exit(1);
}

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.post("/api/scan", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded." });
    }
    const { length_cm, width_cm, height_cm, city } = req.body;
    const length = Number(length_cm) || 0;
    const width = Number(width_cm) || 0;
    const height = Number(height_cm) || 0;

    const result = await runScan({ imageBuffer: req.file.buffer, length, width, height, city });

    const record = {
      savedAt: new Date().toISOString(),
      promptVersion: PROMPT_VERSION,
      input: { length_cm: length, width_cm: width, height_cm: height, city },
      ...(result.ok
        ? { image: { originalBytes: result.meta.originalBytes, resizedBytes: result.meta.resizedBytes }, usage: result.meta, raw_response: result.report }
        : { error: result.error, firstError: result.firstError, detail: result.detail, rawResponses: result.rawResponses }),
    };
    const savedFile = await saveResponse(record, result.ok ? "OK" : "FAILED");

    if (!result.ok) {
      return res.status(422).json({ error: result.error, detail: result.detail });
    }

    res.json({ report: result.report, meta: { ...result.meta, savedFile } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

async function saveResponse(record, status) {
  const dir = path.join(__dirname, "responses");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}_${status}.json`;
  await fs.writeFile(path.join(dir, filename), JSON.stringify(record, null, 2));
  return filename;
}

registerEvalRoutes(app);

const PORT = process.env.PORT || 3001;
loadSpeciesContext().then(() => {
  app.listen(PORT, () => {
    console.log(`\nTank Scan harness running.`);
    console.log(`Open http://localhost:${PORT} in your browser to scan a tank.`);
    console.log(`Open http://localhost:${PORT}/eval.html for the T-002 accuracy evaluation tools.\n`);
  });
});
