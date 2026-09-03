"use client";

// T-012 verification page — exercises export/import programmatically so the
// round trip can be checked without depending on intercepting a real browser
// download. Not linked from the app; visit /dev/export directly.
import { useState } from "react";
import { ensureDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { runQuery } from "@/db/sqlite-client";
import { buildJsonExport, buildCsvZip, buildPhotosZip } from "@/lib/export";
import { importJsonExport } from "@/lib/import";
import { writePhotoFile } from "@/lib/opfs-files";

export default function ExportDevPage() {
  const [log, setLog] = useState<string[]>([]);
  const [lastExport, setLastExport] = useState<Awaited<ReturnType<typeof buildJsonExport>> | null>(null);

  function line(s: string) {
    setLog((prev) => [...prev, s]);
  }

  async function tableCount(name: string): Promise<number> {
    const r = await runQuery(`SELECT COUNT(*) FROM "${name}"`, []);
    return r.ok ? (r.rows[0][0] as number) : -1;
  }

  async function handleWriteTestPhoto() {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes — not a real image, just non-empty content to verify byte round-trip
    await writePhotoFile("test-data/photo-0.jpg", new Blob([bytes]));
    line(`Wrote a real (fake-content) file to OPFS at photos/test-data/photo-0.jpg (${bytes.length} bytes) so photo export has something real to find.`);
  }

  async function handleExportJson() {
    const data = await buildJsonExport();
    setLastExport(data);
    const tableSummary = Object.entries(data.tables)
      .map(([name, t]) => `${name}=${t.rows.length}`)
      .join(", ");
    line(`JSON export: ${JSON.stringify(data).length} bytes. Row counts: ${tableSummary}`);
  }

  async function handleExportCsv() {
    const zip = await buildCsvZip();
    line(`CSV zip: ${zip.length} bytes.`);
  }

  async function handleExportPhotos() {
    const zip = await buildPhotosZip();
    line(`Photos zip: ${zip.length} bytes.`);
  }

  async function handleWipeAndImport() {
    if (!lastExport) {
      line("Export JSON first.");
      return;
    }
    const before: Record<string, number> = {};
    for (const name of Object.keys(lastExport.tables)) before[name] = await tableCount(name);
    line(`Before wipe: ${JSON.stringify(before)}`);

    for (const name of Object.keys(lastExport.tables)) {
      await runQuery(`DELETE FROM "${name}"`, []);
    }
    const afterWipe: Record<string, number> = {};
    for (const name of Object.keys(lastExport.tables)) afterWipe[name] = await tableCount(name);
    line(`After wipe (should be all 0): ${JSON.stringify(afterWipe)}`);

    const result = await importJsonExport(lastExport);
    line(`Import result: ${JSON.stringify(result)}`);

    const afterImport: Record<string, number> = {};
    for (const name of Object.keys(lastExport.tables)) afterImport[name] = await tableCount(name);
    const restored = Object.keys(before).every((k) => before[k] === afterImport[k]);
    line(`After import: ${JSON.stringify(afterImport)}`);
    line(restored ? "✅ RESTORED EXACTLY — every table count matches pre-wipe." : "❌ MISMATCH — see counts above.");
  }

  async function handleImportTwice() {
    if (!lastExport) {
      line("Export JSON first.");
      return;
    }
    const before: Record<string, number> = {};
    for (const name of Object.keys(lastExport.tables)) before[name] = await tableCount(name);

    await importJsonExport(lastExport);
    await importJsonExport(lastExport);

    const after: Record<string, number> = {};
    for (const name of Object.keys(lastExport.tables)) after[name] = await tableCount(name);
    const noDuplicates = Object.keys(before).every((k) => before[k] === after[k]);
    line(`Import same file twice — before: ${JSON.stringify(before)}, after: ${JSON.stringify(after)}`);
    line(noDuplicates ? "✅ NO DUPLICATES — counts unchanged." : "❌ DUPLICATES CREATED — see counts above.");
  }

  return (
    <div style={{ padding: 24, fontFamily: "monospace", fontSize: 13 }}>
      <h1>T-012 export/import verification</h1>
      <p>Run in order: boot → (seed data on /dev/db first) → write test photo → export JSON → wipe &amp; import.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={async () => { await ensureDb(); await runMigrations(); line("DB ready."); }}>1. Boot DB</button>
        <button onClick={handleWriteTestPhoto}>2. Write test photo to OPFS</button>
        <button onClick={handleExportJson}>3. Export JSON</button>
        <button onClick={handleExportCsv}>4. Export CSV zip</button>
        <button onClick={handleExportPhotos}>5. Export photos zip</button>
        <button onClick={handleWipeAndImport}>6. Wipe all tables, then import last export</button>
        <button onClick={handleImportTwice}>7. Import last export twice — check no duplicates</button>
      </div>
      <pre>{log.join("\n")}</pre>
    </div>
  );
}
