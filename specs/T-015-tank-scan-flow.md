# T-015 — Tank Scan flow and Tank Report

**Phase 1 · Depends on: T-011, T-013, T-014, T-016, T-018, T-021 · Size: 3 days**

*Rewritten 2026-08-31: livestock (species) identification removed from this flow — see the decision log in `specs/PROGRESS.md` and `docs/03-ai-contracts.md` Contract 1. T-002's accuracy evaluation against 25 real photos showed equipment/algae/setup detection is strong but species ID on schooling fish is not (37.5%, including a confident wrong call on an easy photo). Species now go in by hand, immediately after the scan, using T-016's flow — including an optional single-fish photo-ID assist (Contract 6) for anyone unsure what they have.*

## Goal

The product's hero feature, end to end: photo → two questions → Tank Report → livestock added by hand → tank set up.

## Why

This is the wedge (`docs/00-product-plan.md` §5). Everything else in v1 is table stakes the incumbent already proved people want. This is the reason to switch, the store screenshot, and the thing someone shows a friend. Narrowing Tank Scan to what a photo actually answers reliably — rather than presenting an unreliable species guess as fact — is itself part of the trust-building story, not a downgrade of it.

## In scope

**The flow, per the six steps in the product plan:**

1. Capture (T-014).
2. **Two questions, not twenty.** Tank dimensions — with common-size shortcuts and a manual entry — and city. Nothing else. Volume is calculated and shown.
3. Call `/scan`. Show real progress, not a spinner with no information; the call takes 10–20 seconds and silence feels broken.
4. **Render the Tank Report** per the rendering rules in `docs/03-ai-contracts.md`:
   - `image_quality.usable: false` → show advice and a retake button, **never a report**.
   - Findings as `SeverityCard`s grouped fix-now / watch / improve, explanation visible without tapping.
   - Every finding shows what it was based on; tapping a grounding reference opens that corpus entry.
   - `could_not_determine` rendered prominently as a visible list. This is a feature, not an apology.
   - ~~Clarifying questions as inline inputs that update the report in place.~~ **Superseded 2026-09-01, per Jaideep's live-testing feedback**: AI-generated clarifying questions read as redundant filler on-screen. Replaced with a direct "Equipment we missed?" quick-add (type + wattage/flow-rate, same pattern as the tank detail page's equipment form) — a more useful way to close the same gap the questions were trying to close. `clarifying_questions` is still generated and stored in `scans.raw_response` for the eval set; it's just not rendered as its own interactive card anymore.
   - Confidence below 0.5 marked "not sure"; below 0.35 rendered as a question rather than a finding.
5. **Accept into the database**: detected equipment becomes `equipment` rows, plants become `plants` rows, setup type and scores stored on the `tank` row, recommended maintenance pre-fills a reminder schedule the user can edit.
6. **Immediately walk into livestock entry** (T-016's add-livestock flow, not a separate menu item): species picker, one at a time, with counts — plus the "I don't know this fish" photo-ID assist (`species-id/v1`, Contract 6) offered inline for anyone unsure. `compat/v1` runs on each addition per T-016. Dex cards unlock as livestock is added. Onboarding is complete once at least the tank itself is set up; livestock can be added now or skipped and added later — never a hard gate.
7. Store the full `raw_response` forever — it is the evaluation set and it makes scan comparison possible later.

**Every detected item is editable before accepting.** The user can correct an equipment type, remove a wrongly identified plant, add one the model missed. Corrections are stored in `scans.user_corrections` — that is labelled training signal.

## Out of scope

Scan history and comparison over time (Pro, Phase 2). Timelapse. Re-scan reminders. Any form of automatic livestock/species detection from the tank photo — see the note at the top of this spec; if revisited, it needs its own T-002-style evaluation before being added back.

## Rules

- **Never block.** If the report flags a problem, the user can still accept everything. Principle 01.
- The report is not a verdict. Tone per `docs/04-design-system.md`: never blame, never scold. "Your tank is 12 days old — this is normal at this stage."
- Works partially offline: if the scan call fails, the photo is saved and the user can retry later without re-taking it.
- **The Tank Report must never name or count a species.** If a finding needs to reference livestock generically ("if you're keeping tropical fish"), phrase it that way — never as an assertion about what's actually in the tank, since the scan doesn't know that yet.

## Acceptance criteria

1. From the tanks list, "Scan a tank" leads through capture → two questions → a report in under a minute on a normal connection.
2. The report shows at least one finding with a severity, an explanation, and a visible source.
3. The report shows a "could not determine" list.
4. ~~A clarifying question can be answered inline and the report updates.~~ Superseded — see the note in step 4 above. Instead: from the report screen, a missed piece of equipment (e.g. a heater) can be added with its rating, and it's saved as a real equipment row when the tank is accepted.
5. **The report never mentions a specific fish species or count.** Check this explicitly — it is the thing most likely to silently regress back in.
6. Accepting creates the tank with its equipment and plants, and pre-fills at least one reminder.
7. Accepting immediately offers to add livestock — species picker with counts, and the "I don't know this fish" photo option — without needing to navigate away from the flow.
8. Adding a species via the photo-ID assist shows ranked candidates the user must confirm, never an auto-filled answer.
9. Skipping livestock entry at this point still leaves a usable, saved tank — it can be added later from the tank's livestock tab.
10. A report that flags a problem (e.g. no heater visible) still lets everything be accepted.
11. Turning off the network mid-scan shows a clear retry option and does not lose the photo.
12. The saved scan row contains the full raw JSON — check in the SQLite inspector.

## Notes for Claude Code

The temptation will be to re-add a lightweight livestock guess "just for the onboarding vibe." Don't — this was cut deliberately after measuring it, not out of caution. If Jaideep asks for it back, point him at the T-002 numbers in `specs/PROGRESS.md` first.
