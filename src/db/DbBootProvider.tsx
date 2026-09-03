"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ensureDb } from "./client";
import { runMigrations } from "./migrate";
import { seedSpecies, countSpecies } from "./queries/species";
import { seedParameterDefs } from "./queries/parameter-defs";
import { getSpeciesSeedVersion, setSpeciesSeedVersion } from "./queries/settings";

// Bump this whenever data/species.seed.json changes in a way existing
// installs should pick up (new species, corrected care data, or — the bug
// this version marker was added to fix — new `imageUri` values). A device
// that seeded species before this existed reseeds once, then stores "2".
const SPECIES_SEED_VERSION = "2";

/**
 * Seeds species + the 8 global parameter defs on first real boot, and
 * reseeds species whenever the seed file's own version has moved on from
 * what this browser last applied. `seedSpecies()` upserts by id and only
 * touches rows still owned by the seed file (`origin: 'seed'`), so this is
 * safe to re-run — it can't clobber a user's own edits or AI-generated
 * species. Without the version check, a device that seeded species before
 * the 30→445 catalog expansion (or before species photos existed) would
 * never see either update, since seeding used to run only on an empty
 * table — found from Jaideep reporting Dex photos missing on a real device
 * that had been seeded months earlier.
 */
async function seedIfEmpty() {
  const existing = await countSpecies();
  const storedVersion = await getSpeciesSeedVersion();
  if (existing === 0 || storedVersion !== SPECIES_SEED_VERSION) {
    const res = await fetch("/api/species-seed");
    const seedData = await res.json();
    await seedSpecies(seedData);
    await setSpeciesSeedVersion(SPECIES_SEED_VERSION);
  }
  await seedParameterDefs(); // itself idempotent — no-ops if already seeded
}

type BootState = { status: "booting" } | { status: "ready"; persistent: boolean } | { status: "error"; message: string };

// Separate from the SQLite DB itself (readable even when SQLite fails to
// open) — records whether this browser has ever successfully persisted
// data. If it has, and this boot came back non-persistent, that's almost
// certainly the OPFS-locked-by-another-tab case (see aquaai-worker.mjs),
// not "your browser doesn't support this" — the banner below says so
// specifically instead of the generic, misleading message, since a real
// user reading "your browser doesn't support local storage" reasonably
// concluded their tank data was gone, when it was actually sitting safely
// in OPFS the whole time.
const EVER_PERSISTENT_KEY = "aquaai_opfs_ever_persistent";

function hasEverPersisted(): boolean {
  try {
    return localStorage.getItem(EVER_PERSISTENT_KEY) === "1";
  } catch {
    return false;
  }
}

function markEverPersisted() {
  try {
    localStorage.setItem(EVER_PERSISTENT_KEY, "1");
  } catch {
    // best-effort only
  }
}

/**
 * Boots the SQLite-WASM database and runs migrations once, app-wide.
 * Without this, every page would need to remember to call ensureDb()
 * itself (as the /dev/* pages do) before any query — this is the real
 * app's single boot point. Blocks rendering until ready, per T-011's
 * requirement to show a clear message rather than silently fail when
 * OPFS is unsupported.
 */
export function DbBootProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootState>({ status: "booting" });

  useEffect(() => {
    (async () => {
      try {
        const dbStatus = await ensureDb();
        const migrationResult = await runMigrations();
        if (!migrationResult.ok) {
          setState({ status: "error", message: migrationResult.error });
          return;
        }
        await seedIfEmpty();
        if (dbStatus.persistent) markEverPersisted();
        setState({ status: "ready", persistent: dbStatus.persistent });
      } catch (err) {
        setState({ status: "error", message: String(err) });
      }
    })();
  }, []);

  if (state.status === "booting") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-ground)" }}>
        <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-ground)", padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <p style={{ fontWeight: 600, color: "var(--color-fix-now)", marginBottom: 8 }}>Couldn&apos;t start the local database</p>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!state.persistent && (
        <div style={{ background: "var(--color-fix-now)", color: "white", padding: 8, textAlign: "center", fontSize: "var(--font-caption-size)" }}>
          {hasEverPersisted() ? (
            <>Couldn&apos;t open your saved data — this usually means AquaAI is already open in another tab or window. Close it there, then reload this page. Your data is safe.</>
          ) : (
            <>Your browser doesn&apos;t support local storage the app needs — data won&apos;t be saved when you close this tab.</>
          )}
        </div>
      )}
      {children}
    </>
  );
}
