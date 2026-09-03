# T-017 — Parameter logging, graphs, thresholds

**Phase 1 · Depends on: T-011 · Size: 3 days**

## Goal

Fast logging of water parameters, per-tank target ranges, and graphs good enough that people switch apps for them.

## Why

This is the single most-praised feature across the entire competitor set, and the reason Aquarium Log holds 4.3★. It has to be at least as good, or nothing else matters to the hobbyist audience.

> "Instead of generic standard parameters, you can change my parameter threshold specific to my aquarium." — Amy Schmidt, 5★

## In scope

- Default parameters: Ammonia, Nitrite, Nitrate, pH, GH, KH, Temperature, TDS. Plus user-defined custom parameters.
- **Per-tank target ranges** for every parameter. A shrimp tank and a discus tank want different targets for the same reading.
- Fast entry: one screen, all parameters, numeric keypad with decimals, previous value shown as a hint, and a note field.
- **Built-in test timer** — liquid test kits need 5-minute waits. Multiple timers at once, each labelled with which test it belongs to. A reviewer asked for exactly this: *"the stopwatches for testing water parameters post the same notification when they are finished. It would be so nice if you could include which test has finished."*
- `method` recorded per measurement — liquid kit, strip, probe, lab, estimate. Strips and liquid kits disagree, and knowing which was used lets the app hedge appropriately.
- Optional photo of the test vial attached to a reading.
- **Graphs** per `docs/04-design-system.md`: target band shaded behind the line, most recent point emphasised with its value, out-of-range points in severity colour, faint horizontal grid only.
- **Maintenance events overlaid on the graph as vertical markers** — water changes, dosing, filter cleans. Requested repeatedly on Aquarium Log and never delivered: *"a vertical line where I dose or do a water change so I can see if changes in the graph line are due to me or due to something else."*
- Quick-log buttons on the tank screen: water change (with percentage), feed, dose, filter clean.
- Out-of-range readings surface on the tank overview with an explanation, not just a red number.

## Out of scope

Test strip photo reading (later — accuracy is hard and colour calibration under aquarium lighting is unsolved). CSV import of historical data. Free-tier parameter limits (T-025).

## Acceptance criteria

1. Logging all eight default parameters takes under 60 seconds, with the keypad accepting decimals every time.
2. Target ranges can be set per tank, and the same parameter can have different targets in two tanks.
3. A reading outside its range is visibly marked, with a plain-language explanation of what it means.
4. The graph shows the target band shaded, and the last point labelled with its value.
5. Two test timers can run at once and each notification says which test finished.
6. Logging a water change adds a marker to the graph at the right point in time.
7. Graphs are readable in dark mode.
8. With 200 measurements in a tank, the graph screen still opens quickly.
9. Everything works in aeroplane mode.
