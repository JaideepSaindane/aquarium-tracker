# T-022 — Journal, photos, livestock timeline

**Phase 1 · Depends on: T-011, T-020 · Size: 2 days**

## Goal

A diary of the tank and a per-fish history, with photos.

## Why

After graphs, the journal and photo gallery are the most-loved features in the competitor set — and the per-livestock timeline is the thing Aquarium Log users asked for repeatedly and never got:

> "The features that I wish this had are the ability to track a timeline for each livestock added to the tank." — John Habig

> "The Gallery is also very useful for comparing images before and after if you're dealing with algae problems." — Dariella Almeida

## In scope

- **Tank journal**: dated entries, markdown-ish formatting, photos attached, typed as journal / maintenance / incident / treatment / water change.
- Entries created automatically by other parts of the app — a triage becomes an incident, a water change becomes a maintenance entry, a scan becomes an entry with the report attached — so the history builds itself without effort.
- **Photo gallery** per tank, chronological, with a date-tagged grid. A reviewer asked specifically for date tagging: *"being able to tag it as a date instead of just what species are in it."*
- Full-screen photo view with pinch zoom. (Zoom is currently broken in Aquarium Log — a small, real differentiator.)
- **Per-livestock timeline** from `livestock_events`: added, photographed, treated, spawned, observed, died. Shown on the livestock detail screen as a vertical timeline.
- Search across journal entries.
- Photos stored locally via `expo-file-system`, indexed in the `photos` table, rendered with `expo-image` for caching. Nothing uploads.

## Out of scope

Timelapse video generation (Pro, Phase 2). Cloud photo backup (Phase 2). Community sharing.

## Acceptance criteria

1. A journal entry with two photos can be created in under 30 seconds.
2. Completing a water change automatically creates a maintenance entry.
3. Running an emergency triage automatically creates an incident entry containing the triage result.
4. The photo gallery shows photos grouped by date and opens full screen.
5. **Pinch-to-zoom works on a full-screen photo.**
6. Opening a fish shows its timeline: when it was added, any photos, any treatments.
7. Searching the journal for a word finds the entry containing it.
8. With 200 photos in a tank the gallery still scrolls smoothly on a mid-range Android phone.
9. Everything works in aeroplane mode.
10. Photos survive an app update — verify by building a new version over an existing install.
