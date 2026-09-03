"use client";

// T-012 — export everything, one tap, free forever, no account. See
// specs/T-012-export-backup.md. Uses raw SQL (via runQuery) rather than the
// Drizzle schema objects so every table is covered automatically, including
// ones added by later tasks, with no per-table code to maintain here.
import { zipSync, type Zippable } from "fflate";
import { runQuery } from "@/db/sqlite-client";
import { toCsv } from "./csv";
import { readPhotoFile } from "./opfs-files";

const SYSTEM_TABLES = new Set(["__drizzle_migrations"]);

async function listTableNames(): Promise<string[]> {
  const result = await runQuery(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    []
  );
  if (!result.ok) throw new Error(result.error);
  return result.rows.map((r) => r[0] as string).filter((name) => !SYSTEM_TABLES.has(name));
}

async function getTableColumns(table: string): Promise<string[]> {
  const result = await runQuery(`PRAGMA table_info("${table}")`, []);
  if (!result.ok) throw new Error(result.error);
  // pragma table_info columns: cid, name, type, notnull, dflt_value, pk
  return result.rows.map((r) => r[1] as string);
}

async function getTableRows(table: string): Promise<{ columns: string[]; rows: unknown[][] }> {
  const columns = await getTableColumns(table);
  const result = await runQuery(`SELECT * FROM "${table}"`, []);
  if (!result.ok) throw new Error(result.error);
  return { columns, rows: result.rows };
}

export type ExportedDatabase = {
  version: 1;
  exportedAt: string;
  tables: Record<string, { columns: string[]; rows: unknown[][] }>;
};

/** The complete database, every table, structured so it can be re-imported. */
export async function buildJsonExport(): Promise<ExportedDatabase> {
  const tableNames = await listTableNames();
  const tables: ExportedDatabase["tables"] = {};
  for (const name of tableNames) {
    tables[name] = await getTableRows(name);
  }
  return { version: 1, exportedAt: new Date().toISOString(), tables };
}

/** One CSV file per table, zipped, human-readable headers already match column names. */
export async function buildCsvZip(): Promise<Uint8Array> {
  const tableNames = await listTableNames();
  const files: Zippable = {};
  for (const name of tableNames) {
    const { columns, rows } = await getTableRows(name);
    files[`${name}.csv`] = new TextEncoder().encode(toCsv(columns, rows));
  }
  return zipSync(files, { level: 6 });
}

/**
 * A zip of the actual photo files plus a manifest CSV mapping filenames to
 * tanks/livestock/dates. Missing files (nothing captured yet — T-014 isn't
 * built) are skipped, not fatal: the manifest still lists every photo row,
 * with a "file_included" column saying whether the bytes were found.
 */
export async function buildPhotosZip(): Promise<Uint8Array> {
  const { columns, rows } = await getTableRows("photos");
  const idIdx = columns.indexOf("id");
  const uriIdx = columns.indexOf("local_uri");
  const tankIdx = columns.indexOf("tank_id");
  const livestockIdx = columns.indexOf("livestock_id");
  const takenIdx = columns.indexOf("taken_at");

  const files: Zippable = {};
  const manifestRows: unknown[][] = [];

  for (const row of rows) {
    const localUri = row[uriIdx] as string;
    const filename = localUri.split("/").pop() ?? row[idIdx];
    const blob = await readPhotoFile(localUri);
    if (blob) {
      files[`photos/${filename}`] = new Uint8Array(await blob.arrayBuffer());
    }
    manifestRows.push([row[idIdx], filename, row[tankIdx], row[livestockIdx], row[takenIdx], blob ? "yes" : "no"]);
  }

  files["manifest.csv"] = new TextEncoder().encode(
    toCsv(["photo_id", "filename", "tank_id", "livestock_id", "taken_at", "file_included"], manifestRows)
  );

  return zipSync(files, { level: 6 });
}

export function downloadBlob(bytes: Uint8Array | string, filename: string, mimeType: string) {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Web Share API where supported (e.g. Android Chrome) — no native share sheet exists on web. */
export async function canShareFiles(): Promise<boolean> {
  return typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator;
}

export async function shareFile(bytes: Uint8Array | string, filename: string, mimeType: string): Promise<boolean> {
  const file = new File([bytes as BlobPart], filename, { type: mimeType });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { files: File[] }) => Promise<void> };
  if (!nav.canShare?.({ files: [file] }) || !nav.share) return false;
  try {
    await nav.share({ files: [file] });
    return true;
  } catch {
    return false; // user cancelled — not an error
  }
}
