# T-016 — Tank profile and livestock

**Phase 1 · Depends on: T-011 · Size: 2–3 days**

*Updated 2026-08-31: this is now where ALL livestock enters the app — Tank Scan (T-015) no longer detects species from the tank photo (see `docs/03-ai-contracts.md` Contract 1 and the decision log in `specs/PROGRESS.md`). Added the single-fish photo-ID assist (`species-id/v1`, Contract 6) as an alternative to typing a search term. Size estimate raised slightly for that reason — this flow is now load-bearing for the whole app, not a secondary management screen.*

## Goal

Create and edit tanks by hand, and manage what lives in them — including the compatibility warnings that never block. This is also where Tank Scan (T-015) hands off immediately after a scan: the user lands here to add livestock right after seeing their Tank Report.

## In scope

- Tanks list with photo, name, volume, livestock count, and a status indicator if anything needs attention. **Addendum (nav restructure pass):** the My Tanks card should also surface a style tag (e.g. "Planted"), creation date, a CO2 badge (derived from an `equipment` row of `type = 'co2'`, no schema change needed), and a livestock badge row (`N× Species`, from `livestock` joined to `species` by `tankId`). All of this is existing per-tank data, not currently displayed on the list — this is a query + card-template change only.
- Create and edit a tank: name, photo, **length / width / height** (volume calculated, overridable), shape, water type, planted, CO₂, city, start date, substrate.
- Add livestock: species search → count → nickname → date added. Adding six of the same species is one action, not six.
- **"I don't know this fish" photo-ID assist**, offered alongside the search box, not buried in a menu: take/upload a close-up photo of one fish → `species-id/v1` (Contract 6) returns up to 3 ranked candidates, each shown with its confidence and reasoning, **none pre-selected or presented as the answer**. Tapping a candidate fills the species picker exactly as a manual search selection would. If nothing matches well, route straight into the "add it anyway" / `species-gen/v1` flow below rather than a dead end.
- Livestock list grouped by species, showing count, date added, and status.
- Edit and remove livestock, including recording a death with an optional cause. **Removing livestock is free and always available** — Aquareka locked this behind payment and a reviewer said it directly: *"In the freemium version I cannot delete fish that I accidentally added to my aquarium."*
- Plants and equipment lists with the same add/edit pattern.
- **Compatibility check on add** (`compat/v1`): show warnings inline, explain them, and let the user save anyway. A dismissed warning is remembered and not repeated.
- **Species search that never fails.** If a species is not found — by typed search or by the photo-ID assist coming up empty — offer "add it anyway" → `species-gen/v1` produces a provisional card, marked unverified, saved and usable immediately.
- Derived checks that need no AI call: filter flow against volume, heater wattage against volume and city ambient temperature, stocking level, schooling species kept below their minimum group size.

## Out of scope

The Dex (T-021). Journal and photos (T-022). Breeding.

## Rules

- **Advise, never block.** Principle 01. This screen is where Aquareka lost a full star. Every warning is dismissible and every save succeeds.
- **Footprint, not just volume.** Where a conflict would exist in a short tank but not a long one, say so — this is the kuhli-loach-and-corydoras case that a reviewer diagnosed precisely.
- Provisional species cards show a visible "unverified" badge and a one-tap "this looks wrong" report.
- **The photo-ID assist never auto-fills a species.** Every candidate requires an explicit tap to select, and low-confidence candidates (below 0.5) are visibly marked as such. This mirrors why livestock ID was pulled out of Tank Scan in the first place — a confident wrong guess is worse than an honest "we're not sure."
- All of this works offline except the compatibility check, species generation, and the photo-ID assist, which degrade gracefully (photo-ID assist hidden or disabled with an explanation when offline; typed search still works from the local `species` table).

## Acceptance criteria

1. A tank can be created by hand, with dimensions, and the volume calculates correctly.
2. Adding 6 neon tetras is one operation and shows as "6 × Neon tetra".
3. Adding an angelfish to a small tank with neons shows a warning explaining why, and **still saves when confirmed**.
4. Dismissing that warning and re-opening the tank does not show it again.
5. Deleting a fish works, with no payment prompt anywhere.
6. Searching for a species that is not in the database offers to add it, produces a card with care details, and marks it unverified.
6a. The "I don't know this fish" photo-ID assist returns up to 3 candidates with visible confidence, none pre-selected; tapping one fills the species picker; a low-confidence or empty result routes into the "add it anyway" flow rather than a dead end.
7. Recording a death asks for an optional cause, kindly, and does not feel like a scorecard.
8. A tank with a filter rated below its volume shows a flow warning without any AI call.
9. Everything except compatibility and species generation works in aeroplane mode.
