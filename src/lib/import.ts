"use client";

// T-012 — restore a JSON export into an empty app, or merge into a
// non-empty one without duplicating. `INSERT OR IGNORE` keyed by each
// table's real primary key achieves both: empty app -> every row inserted;
// re-importing the same file -> every row already exists, so nothing
// duplicates. This does not update rows that already exist with newer
// values from the import — only adds what's missing — which matches what
// the acceptance criteria ask for (restore + no duplicates), not a
// conflict-resolution merge.
import { runQuery } from "@/db/sqlite-client";
import { notifyChanged } from "@/db/live";
import type { ExportedDatabase } from "./export";

// `attempted` counts rows processed per table, not rows actually inserted —
// INSERT OR IGNORE silently skips duplicates and the worker doesn't surface
// a changed-row count. Good enough for a progress log; not a dedup report.
export type ImportResult = { ok: true; attempted: Record<string, number> } | { ok: false; error: string };

export async function importJsonExport(data: ExportedDatabase): Promise<ImportResult> {
  if (data.version !== 1) {
    return { ok: false, error: `Unsupported export version: ${data.version}` };
  }

  const attempted: Record<string, number> = {};

  for (const [table, { columns, rows }] of Object.entries(data.tables)) {
    if (rows.length === 0) {
      attempted[table] = 0;
      continue;
    }
    const placeholders = `(${columns.map(() => "?").join(", ")})`;
    const columnList = columns.map((c) => `"${c}"`).join(", ");
    let count = 0;
    for (const row of rows) {
      const result = await runQuery(
        `INSERT OR IGNORE INTO "${table}" (${columnList}) VALUES ${placeholders}`,
        row
      );
      if (!result.ok) {
        return { ok: false, error: `Failed importing into ${table}: ${result.error}` };
      }
      count++;
    }
    attempted[table] = count;
  }

  notifyChanged();
  return { ok: true, attempted };
}
