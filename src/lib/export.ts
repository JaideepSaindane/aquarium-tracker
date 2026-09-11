"use client";

// T-012 — export everything, one tap, free forever. See
// specs/T-012-export-backup.md. Uses raw SQL (via runQuery) for the tables
// still local, so any newly-added local table is covered automatically
// with no per-table code to maintain here.
//
// 2026-09-11: as tables migrated server-side (tanks/livestock/measurements/
// profile on 2026-09-10; plants/equipment/logEntries/photos/scans/
// aiInteractions/dexCards/dismissedWarnings/userSettings/
// speciesSuggestions/parameterDefs on 2026-09-11), their LOCAL copies went
// stale — new writes go to Postgres, so introspecting local SQLite alone
// silently missed everything written since each table's own migration.
// SERVER_TABLES below is fetched from the real API instead and takes over
// from the matching local table name in every export function; the
// species catalog stays local (it's shared reference data, not per-user —
// see src/server/db/schema.ts's note) and is exported as before.
import { zipSync, type Zippable } from "fflate";
import { runQuery } from "@/db/sqlite-client";
import { toCsv } from "./csv";
import { readPhotoFile } from "./opfs-files";
import { isRemotePhotoUrl } from "./use-photo-src";

const SYSTEM_TABLES = new Set(["__drizzle_migrations"]);

// Local SQLite table name -> API path fetching every row for the current
// user. `user_settings` has no local counterpart (it replaces the local
// `settings` table's account-scoped keys — species_seed_version stays
// local and is exported from there, under `settings`, as before).
const SERVER_TABLE_URLS: Record<string, string> = {
  tanks: "/api/tanks",
  profile: "/api/profile",
  livestock: "/api/livestock?all=1",
  livestock_events: "/api/livestock-events",
  measurements: "/api/measurements?all=1",
  plants: "/api/plants?all=1",
  equipment: "/api/equipment?all=1",
  log_entries: "/api/log-entries?all=1",
  photos: "/api/photos",
  scans: "/api/scans?all=1",
  ai_interactions: "/api/ai-interactions",
  dex_cards: "/api/dex-cards",
  dismissed_warnings: "/api/dismissed-warnings?all=1",
  species_suggestions: "/api/species-suggestions",
  parameter_defs: "/api/parameter-defs?all=1",
  user_settings: "/api/user-settings?all=1",
};

async function fetchServerRows(table: string): Promise<Record<string, unknown>[]> {
  const url = SERVER_TABLE_URLS[table];
  if (!url) return [];
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (Array.isArray(data)) return data;
  return data ? [data] : []; // /api/profile returns one object (or null), not an array
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Server rows come back camelCase (Drizzle's JS field names); local tables' columns are snake_case (SQLite's own column names, via PRAGMA). Converting keeps one consistent header style across the whole export regardless of where a table's data actually lives right now. */
function serverRowsToColumnsRows(rows: Record<string, unknown>[]): { columns: string[]; rows: unknown[][] } {
  if (rows.length === 0) return { columns: [], rows: [] };
  const camelColumns = Object.keys(rows[0]);
  const columns = camelColumns.map(camelToSnake);
  return { columns, rows: rows.map((r) => camelColumns.map((c) => r[c])) };
}

/**
 * Every local table name, plus any server-backed "table" that has no local
 * SQLite counterpart to introspect at all — `user_settings` replaces the
 * account-scoped keys that used to live in the local `settings` table
 * (species_seed_version is the one key that's still genuinely local and
 * stays exported under `settings`, as before), so there's no local table
 * named "user_settings" for the normal introspection query to ever find.
 */
async function listTableNames(): Promise<string[]> {
  const result = await runQuery(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    []
  );
  if (!result.ok) throw new Error(result.error);
  const names = result.rows.map((r) => r[0] as string).filter((name) => !SYSTEM_TABLES.has(name));
  if (!names.includes("user_settings")) names.push("user_settings");
  return names;
}

async function getTableColumns(table: string): Promise<string[]> {
  const result = await runQuery(`PRAGMA table_info("${table}")`, []);
  if (!result.ok) throw new Error(result.error);
  // pragma table_info columns: cid, name, type, notnull, dflt_value, pk
  return result.rows.map((r) => r[1] as string);
}

async function getTableRows(table: string): Promise<{ columns: string[]; rows: unknown[][] }> {
  if (SERVER_TABLE_URLS[table]) return serverRowsToColumnsRows(await fetchServerRows(table));
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

/** The complete database, every table (local + server-backed), structured so it can be re-imported. */
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
 * tanks/livestock/dates. `photos` is server-backed now (2026-09-11); a row
 * whose `local_uri` is a real https Blob URL is fetched over the network,
 * one whose `local_uri` is a legacy OPFS-relative path (pre-migration data)
 * still reads from local browser storage. Missing files either way are
 * skipped, not fatal — the manifest still lists every photo row, with a
 * "file_included" column saying whether the bytes were found.
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
    const blob = isRemotePhotoUrl(localUri)
      ? await fetch(localUri).then((r) => (r.ok ? r.blob() : null)).catch(() => null)
      : await readPhotoFile(localUri);
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
