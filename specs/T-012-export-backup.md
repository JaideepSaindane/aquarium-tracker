# T-012 — Export and backup

**Phase 1 · Depends on: T-011 · Size: 1 day**

## Goal

One tap in Settings exports everything the user has: a JSON file, a zip of CSVs, and a zip of photos. Free tier. No account.

## Why this is task twelve and not task ninety

**Principle 04.** Both competitors' review sections are full of people who lost years of data on a phone change. Aquarium Log promised CSV export in February 2023 and had not shipped it by 2026.

> "I have a new phone and it hasn't imported my aquarium so I've lost all my previous measurements."

Export is also the **migration safety net** (see T-011): if a schema change goes wrong, a user with an export still has their data. Building it now, while there are three tables of test data rather than a year of real data, is far easier — and it means it can never be quietly deferred.

## In scope

- **JSON export** — the complete database, one file, every table, structured so it can be re-imported.
- **CSV export** — one file per table, in a zip, with human-readable headers, for people who want a spreadsheet.
- **Photo export** — a zip of the original image files plus a manifest CSV mapping filenames to tanks, livestock and dates.
- Browser file download (or the Web Share API where supported, e.g. Android Chrome) so the file can be saved locally, shared to WhatsApp/Drive/email, or opened directly — updated 2026-08-31 for the web pivot; no native share sheet exists, but Web Share is a close equivalent on supporting browsers.
- **Import from JSON export** — restore into an empty app, and merge into a non-empty one without duplicating.
- Everything works offline. Nothing requires an account or Pro.

## Out of scope

PDF tank reports (a Pro feature, later). Cloud backup (Phase 2). Importing from competitors' formats (worth doing later; Aquarium Log has no export to import from, which is itself the point).

## Acceptance criteria

1. Settings → Export produces three files that can be saved to the phone or shared.
2. Opening the CSV zip on a computer shows readable spreadsheets with sensible column names.
3. The JSON file contains every tank, every measurement and every log entry visible in the app.
4. The photo zip contains the actual photos, and the manifest correctly says which tank each belongs to.
5. Wiping the app's data and importing the JSON restores everything — same tanks, same measurements, same reminders.
6. Importing the same file twice does not create duplicates.
7. All of the above works in aeroplane mode.
8. Nothing in the export flow shows a Pro prompt.

## Notes for Claude Code

Test the export with a database holding at least a few hundred measurements and 50 photos, not with three rows. Large exports are where this breaks — memory limits and zip generation time in the browser, especially on lower-end Android phones.
