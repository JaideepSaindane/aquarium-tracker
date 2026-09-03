"use client";

// Hand-rolled migration runner — the browser-safe equivalent of what
// useMigrations() did on expo-sqlite. drizzle-orm's own sqlite-proxy
// migrator needs Node's fs to read migration files, which doesn't exist in
// the browser, so this reads from the pre-bundled migrations.generated.ts
// instead (see scripts/bundle-migrations.mjs) and applies whatever hasn't
// run yet, tracked in a __drizzle_migrations table exactly like the native
// migrators do, so `drizzle-kit generate` output stays a drop-in fit.
import { runQuery } from "./sqlite-client";
import { migrations } from "./migrations.generated";

export type MigrationStatus = { ok: true; applied: number } | { ok: false; error: string };

export async function runMigrations(): Promise<MigrationStatus> {
  const createTable = await runQuery(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, tag TEXT NOT NULL, applied_at INTEGER NOT NULL)`,
    []
  );
  if (!createTable.ok) return { ok: false, error: createTable.error };

  const appliedResult = await runQuery(`SELECT tag FROM __drizzle_migrations`, []);
  if (!appliedResult.ok) return { ok: false, error: appliedResult.error };
  const appliedTags = new Set(appliedResult.rows.map((row) => row[0] as string));

  let applied = 0;
  for (const migration of migrations) {
    if (appliedTags.has(migration.tag)) continue;
    for (const statement of migration.statements) {
      const result = await runQuery(statement, []);
      if (!result.ok) {
        return { ok: false, error: `Migration ${migration.tag} failed on statement:\n${statement}\n\n${result.error}` };
      }
    }
    const record = await runQuery(`INSERT INTO __drizzle_migrations (tag, applied_at) VALUES (?, ?)`, [
      migration.tag,
      migration.when,
    ]);
    if (!record.ok) return { ok: false, error: record.error };
    applied++;
  }

  return { ok: true, applied };
}
