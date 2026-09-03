# T-027 — Guided Tank Setup Planner

**Phase 1 · Depends on: T-011, T-016, T-021, T-023 · Size: 2–3 days**

## Goal

For someone who does not have a tank yet, turn "I'm thinking about getting fish" into a saved, planned tank with an editable equipment list and a starting reminder schedule — without a single AI call, and without the app inventing numbers it can't stand behind.

## Why

This is the third door in T-023's stage picker (`I'm thinking about getting fish`), currently a dead end marked "not built yet." It is the opposite direction of Tank Scan: instead of a photo of an existing tank producing a report, this is dimensions and species choices producing a shopping/setup list. It shares a destination shape with T-015/T-016 (a `tanks` row plus `equipment`/`plants` rows plus reminders) but not an input or a computation method, so it is its own flow rather than a mode of either.

## In scope

**Screen 1.1 — Tank basics.**
- Tank type: Planted / Bare bottom / Hardscape only.
- Footprint: length × width × height, with a ft/cm toggle (reuse whatever unit-toggle pattern Tank Scan's dimension question uses once T-015 exists; otherwise build once here and have T-015 reuse it — do not build two different unit toggles).
- Species selector: search box + a recommendation list pulled from the existing species table, each row showing its `difficulty` badge (Beginner/Intermediate/Expert — field already exists on `species`, see `src/db/schema.ts`). Reuses the species search component from T-016's livestock-add flow if one exists by the time this is built.

**Screen 1.2 — Setup & equipment report.**
- Auto-populated, **individually editable** rows (never locked, per Principle 1 — advise, don't assert false precision, and let the user override):
  - **Heater** — target wattage, from tank volume and the ambient-temperature gap for the user's city (see Climate data below).
  - **Lighting** — wattage rating + fixture length, from tank footprint and planted tier.
  - **Filter** — flow rate (L/h), from tank volume and bioload assumption (planted vs. not, species chosen).
  - **Substrate** — volume, from footprint × a target depth.
  - **Hardscape/accessories** — driven by species choices (e.g. caves for cave-dwellers, leaf litter for soft-water/blackwater species) — a small rule table, not exhaustive at launch.
- Image placeholder card: "Add a photo once your tank is set up."
- "Save to My Tanks" — writes a `tanks` row with `status: 'planned'` (matching the convention already named in T-023), plus `equipment`/`plants` rows matching the (possibly edited) recommendations, plus the same prefilled-reminders behavior T-015 uses (reuse `src/lib/reminder-presets.ts` — do not build a second reminder-seeding path).

**Recommendation engine — deterministic, local, no AI.** Pure functions, in `src/lib/derived-checks.ts` or a sibling `src/lib/setup-recommendations.ts` (check the current size of `derived-checks.ts` before deciding which):

| Function | Inputs | Notes |
|---|---|---|
| `recommendHeaterWattage` | volume (L), ambient temp (°C, from city table), target temp (°C) | Rule-of-thumb formula: ~1 watt per litre for every ~5°C gap between ambient and target, with a stated safety margin — **write the exact constant into this spec and get it checked before coding**, do not invent it silently in the implementation |
| `recommendFilterFlowRate` | volume (L), planted flag, bioload tier | Follow the same "turnover ×N" logic already used in T-016's derived flow-rate check (4× for standard stocking) — reuse that constant, don't diverge |
| `recommendLightingWattage` | footprint (cm²), planted tier | Coarse banding (low/med/high light plants) is enough for v1 |
| `recommendSubstrateVolume` | footprint (cm²), target depth (cm) | Simple volume math, no judgement call |
| `recommendHardscape` | selected species ids | Small lookup table keyed by species tags (cave-dweller, soft-water, etc.) — starts short, grows over time, never blocks save if empty |

This mirrors the pattern already in production for `checkSchoolingMinimums` and the heater/flow-rate checks in T-016 — same kind of local, instant, offline-safe, no-token-cost derived check, just producing a suggested value instead of a pass/fail warning.

**Climate data — static, bundled, not a live weather API.** A JSON lookup (`data/city-climate.json`, same pattern as `data/species.seed.json`) of representative ambient/room temperature by Indian city or region, coarse (e.g. winter-low / summer-high bands), not live weather — a live API would make this screen require network, which breaks the offline-first rule (`CLAUDE.md` Principle 5, "every screen must render with the network off") and conflates outdoor weather with indoor room temperature anyway. The UI must say plainly that this is an approximation ("based on typical [city] temperatures — check your actual room temp for best results"). If the user's city isn't in the table: ask for an approximate room temperature directly, or fall back to a generic India-wide range — **never block saving** for a missing city (Principle 1).

**Local profile integration.** If a local profile (see T-023's profile addendum) already has a city saved, pre-fill it here; this screen is one of the places that can prompt "save this as your default city" if no profile exists yet.

## Out of scope

- No AI call anywhere in this flow — everything above is deterministic and local.
- No photo (that's Tank Scan, T-015).
- The cycling coach itself (Phase 2, same as T-023's existing carve-out).
- Anything beyond a starting equipment/reminder list — no purchase links, no price estimates, no retailer integration.

## Formulas and city table to be checked before build

This spec intentionally leaves the exact heater-wattage constant, flow-rate turnover multiplier, and the city-climate table's actual numbers as **numbers to be filled in and reviewed with Jaideep before implementation starts** — they are real fishkeeping-domain claims, not implementation details, and CLAUDE.md's instruction to `stop and ask` at genuine forks applies here: shipping a wrong heater-wattage formula is a live-animal-safety-adjacent mistake even though it's "advise, don't block."

## Acceptance criteria

1. From the "I'm thinking about getting fish" stage-picker card, one tap reaches Screen 1.1.
2. Entering tank dimensions and picking 3 species produces an editable equipment/lighting/substrate/hardscape list on Screen 1.2 — no spinner waiting on a network call, because there isn't one.
3. Editing any recommended value (e.g. changing the heater wattage) and saving keeps the edited value, not the original suggestion.
4. Tapping "Save to My Tanks" creates a tank with `status: 'planned'`, visible immediately in the My Tanks list.
5. The new tank has starting reminders already scheduled (visible on its Schedule tab) without any extra setup step.
6. Turning off the network (aeroplane mode) and running through the whole flow works identically — nothing in this screen makes a network call.
7. A city not in the bundled climate table still lets the user finish and save (either by asking for an approximate room temp or a visible generic-range fallback), never a dead end.
