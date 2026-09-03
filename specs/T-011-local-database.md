# T-011 — Local database, schema, migrations

**Phase 1 · Depends on: T-010 · Size: 2–3 days**

*Updated 2026-08-31 for the web pivot: `expo-sqlite` is replaced by SQLite compiled to WebAssembly, persisted via OPFS. Size estimate raised slightly — the reactive live-query behaviour that `expo-sqlite` gave for free now has to be hand-built.*

## Goal

Every table from `docs/02-data-model.md` exists in the browser (persisted, not just in memory), with working migrations and the 30 seed species loaded.

## Why

SQLite is still the source of truth for this app (Principle 05) — the pivot to web does not change that, only where it physically lives. Everything else is a view over it. Getting the shape right now is much cheaper than migrating user data later.

## In scope

- SQLite-WASM (`wa-sqlite`, or `sql.js` if it proves better supported at project start — verify current OPFS support for each before choosing) + Drizzle ORM with a SQLite driver targeting it.
- Persistence via **OPFS (Origin Private File System)**. Before writing any application code, verify OPFS works end-to-end in a real browser: write, reload the page, read it back. This is the load-bearing piece the whole plan depends on.
- Call `navigator.storage.persist()` on first load and handle both outcomes — browsers can still evict non-persisted storage under pressure.
- All tables from `docs/02-data-model.md`, exactly as specified — including the ones whose reasoning is marked **← why**. Do not simplify `tanks` to volume-only, do not collapse `livestock` into a species join table, do not drop `scheduled_notifications` (rename its concept to track Web Push subscriptions/sends instead, per T-018).
- `drizzle-kit` migration generation, applied at app startup against the WASM database, with queries gated until migrations succeed — the hand-rolled equivalent of what `useMigrations` did on native.
- A seed step that loads `data/species.seed.json` into the `species` table on first launch, and updates it on version bump without destroying user-created or AI-generated species rows.
- **The seed file is nested; the table is flat.** Implement the mapping documented in `docs/02-data-model.md` under the `species` table — `temp_c: {min,max}` becomes `temp_c_min`/`temp_c_max`, and so on — and set `origin: 'seed'` on every loaded row. Arrays are stored as JSON text. A mismatch here is silent and will surface much later as missing care data.
- Species ids are **common-name kebab-case slugs** (`neon-tetra`, not `paracheirodon-innesi`). They are stable forever.
- A typed data-access layer: `src/db/queries/*.ts`, one file per entity.
- **A hand-built reactive layer** (`src/db/live.ts`) since there is no native live-query hook here: a small pub/sub that notifies subscribed hooks/components after every write, so the UI re-renders without polling or manual refetch calls scattered through the app. Keep it in one place.
- A way to browse the database while developing — even a simple debug page that runs arbitrary read queries is enough; there's no drop-in DevTools inspector equivalent on web.

## Out of scope

Any UI beyond a debug query page. Sync. Accounts.

## Rules

- **Do not wrap local SQLite-WASM data in TanStack Query.** The hand-built live-query layer already gives reactive re-rendering; a cache on top creates two sources of truth that drift.
- UUID text primary keys generated client-side, not autoincrement integers — this is what makes future sync possible.
- Timestamps as ISO 8601 UTC strings. All measurements stored metric.
- Soft-delete via `deleted_at` for anything a user might want back.

## Migration discipline

- Test the whole chain, not just the latest step. A user three versions behind must upgrade cleanly.
- Never drop or rewrite a table holding user data without a copy-forward step. Review the create-copy-drop-rename SQL Drizzle generates.
- Write a small script/seed page that populates a realistic test database, because several later tasks need volume to test against: **three tanks, livestock (including some added over 90 days ago), a few hundred measurements across several parameters, ~50 photos, a handful of tasks and journal entries.** T-012, T-017, T-022 and T-026 all depend on this existing.

## Acceptance criteria

1. The app launches in a real browser, creates the database, and runs migrations with no error.
2. The debug query page shows every table from the data model with rows in it.
3. The `species` table contains the same number of rows as `data/species.seed.json` — 30 before T-003, 150 after it. Spot-check one entry and confirm its temperature range, minimum footprint and lifespan all made it across from the nested seed format.
4. **Reloading the page (not just navigating within the app) preserves everything** — this is the direct equivalent of "force-quit and reopen" on native, and is the single most important thing to verify.
5. With the network disabled (browser dev tools offline mode, or airplane mode on the phone with the PWA already loaded once), the app still opens and reads data.
6. Running the test-data script/page produces three tanks with livestock and measurements visible in the debug page.
7. Adding a new column and regenerating a migration upgrades an existing database without losing data. Test this — do not assume it.
8. Confirm the behaviour when OPFS is unsupported (test in a browser/mode known to lack it, or simulate) — the app must show a clear message, not silently fail or lose data invisibly.

## Notes for Claude Code

Verify OPFS actually persists across a full page reload as the very first thing you build here, before writing schema or seed code — if it does not work reliably, the whole plan for this task needs to be revisited with Jaideep before going further.
