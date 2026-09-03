"use client";

import { useEffect, useState } from "react";
import { ensureDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { runQuery } from "@/db/sqlite-client";
import { seedSpecies, listSpecies, getSpecies } from "@/db/queries/species";
import { seedParameterDefs } from "@/db/queries/parameter-defs";
import { seedTestData } from "@/db/seed-test-data";

type TableCount = { name: string; count: number };

export default function DbDevPage() {
  const [bootStatus, setBootStatus] = useState("Booting...");
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [migrationStatus, setMigrationStatus] = useState("");
  const [tableCounts, setTableCounts] = useState<TableCount[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [speciesSpotCheck, setSpeciesSpotCheck] = useState<Record<string, unknown> | null>(null);

  function appendLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function refreshTableCounts() {
    const tablesResult = await runQuery(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name`,
      []
    );
    if (!tablesResult.ok) {
      appendLog(`Failed to list tables: ${tablesResult.error}`);
      return;
    }
    const names = tablesResult.rows.map((r) => r[0] as string);
    const counts: TableCount[] = [];
    for (const name of names) {
      const countResult = await runQuery(`SELECT COUNT(*) FROM "${name}"`, []);
      counts.push({ name, count: countResult.ok ? (countResult.rows[0][0] as number) : -1 });
    }
    setTableCounts(counts);
  }

  useEffect(() => {
    (async () => {
      const status = await ensureDb();
      setPersistent(status.persistent);
      setBootStatus(status.persistent ? "OPFS database open" : `IN-MEMORY ONLY (OPFS unavailable: ${status.opfsError})`);

      const migResult = await runMigrations();
      setMigrationStatus(migResult.ok ? `Applied ${migResult.applied} migration(s).` : `FAILED: ${migResult.error}`);

      await refreshTableCounts();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSeedSpecies() {
    appendLog("Fetching data/species.seed.json...");
    const res = await fetch("/api/species-seed");
    const seedData = await res.json();
    appendLog(`Seeding ${seedData.length} species...`);
    await seedSpecies(seedData);
    const all = await listSpecies();
    appendLog(`species table now has ${all.length} rows.`);
    const check = await getSpecies("betta");
    setSpeciesSpotCheck(check ?? null);
    await refreshTableCounts();
  }

  async function handleSeedParams() {
    await seedParameterDefs();
    appendLog("Seeded 8 global parameter defs.");
    await refreshTableCounts();
  }

  async function handleSeedTestData() {
    appendLog("Seeding test data (this takes a few seconds — ~450 inserts)...");
    const result = await seedTestData();
    appendLog(`Done: ${JSON.stringify(result)}`);
    await refreshTableCounts();
  }

  return (
    <div style={{ padding: 24, fontFamily: "monospace", fontSize: 13 }}>
      <h1>T-011 database debug page</h1>

      <section style={{ marginBottom: 16 }}>
        <p>
          <strong>Boot:</strong> {bootStatus}
        </p>
        <p>
          <strong>Migrations:</strong> {migrationStatus}
        </p>
        {persistent === false && (
          <p style={{ color: "crimson", fontWeight: "bold" }}>
            This browser does not support OPFS — data will NOT survive a reload. See docs/01-architecture.md §Local
            database.
          </p>
        )}
      </section>

      <section style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button onClick={handleSeedSpecies}>1. Seed species (data/species.seed.json)</button>
        <button onClick={handleSeedParams}>2. Seed parameter defs</button>
        <button onClick={handleSeedTestData}>3. Seed test data (3 tanks, livestock, measurements...)</button>
        <button onClick={refreshTableCounts}>Refresh counts</button>
      </section>

      {speciesSpotCheck && (
        <section style={{ marginBottom: 16 }}>
          <h2>Species spot-check: betta</h2>
          <pre>{JSON.stringify(speciesSpotCheck, null, 2)}</pre>
        </section>
      )}

      <section style={{ marginBottom: 16 }}>
        <h2>Tables</h2>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingRight: 24 }}>Table</th>
              <th style={{ textAlign: "left" }}>Rows</th>
            </tr>
          </thead>
          <tbody>
            {tableCounts.map((t) => (
              <tr key={t.name}>
                <td style={{ paddingRight: 24 }}>{t.name}</td>
                <td>{t.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Log</h2>
        <pre>{log.join("\n")}</pre>
      </section>
    </div>
  );
}
