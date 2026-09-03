# T-002 — Accuracy evaluation against 50 real photos

**Phase 0 · Depends on: T-001 · Size: 2–3 days, mostly Jaideep's time**

## Goal

Know, with a number, how good Tank Scan actually is. This is the gate the whole plan rests on.

## Why

Everything downstream assumes a photo can produce a useful report. That assumption has not been tested on real photos taken by real people with real phones through real glass. Competitors' review sections are full of confident wrong information; being wrong confidently is the fastest way to a one-star review in this category.

## In scope

**Jaideep collects the photos.** 50 tank photos from Bangalore Aquarium Hobbyists, Indian Aquarium Hobbyist, and local shops. Deliberately include bad ones: glare, room lights on, algae-covered glass, dark substrate, tinted water, photos taken at an angle. A test set of only good photos proves nothing.

For each photo, record ground truth: what fish and how many, what plants, what equipment, tank dimensions, and any problems a knowledgeable keeper would flag.

**Claude Code builds:**
- A ground-truth file format (JSON or CSV) and a template.
- A batch script that runs every photo through the harness and stores results.
- A comparison script that scores each result against ground truth and produces a summary.

**Scoring dimensions:**

| Dimension | Measure |
|---|---|
| Species identification | % of visible species correctly named |
| False positives | count of species named that are not present — **weighted heavily; this is the dangerous failure** |
| Count accuracy | % within ±1 of true count |
| Equipment detection | % of visible equipment correctly identified |
| Algae type | % correctly classified |
| Finding usefulness | Jaideep's 1–5 judgement per report — would a keeper act on this? |
| Honest uncertainty | % of reports that flagged something as undetermined when it genuinely was |

## Out of scope

Improving the prompt is not part of this task — but you will want to. Do the first full run, record the baseline, *then* iterate, and re-run the whole set after each prompt change so improvement is measured rather than felt.

## The gate

- **Species identification above ~70% on decent photos, with false positives near zero** → the wedge holds. Proceed to Phase 1.
- **Below that, or false positives common** → stop. Options: narrow scope (identify tank conditions and equipment rather than species), shift the wedge to the cycling coach, or require the user to confirm every detected species rather than presenting it as fact.

Either outcome is a good result for two days of work. The failure mode is not a bad number; it is not measuring at all.

## Acceptance criteria

1. A folder of 50 photos with a matching ground-truth file for each.
2. Running one command scores all 50 and prints a summary table.
3. The summary shows every dimension above, with a false-positive count called out separately.
4. Re-running after a prompt edit produces a comparable summary, so two prompt versions can be compared side by side.
5. Jaideep can state, in one sentence, how accurate Tank Scan is.

## Notes for Claude Code

Give Jaideep a dead-simple way to enter ground truth — a spreadsheet he fills in, or a tiny local web form. Do not ask him to hand-write JSON for 50 photos.
