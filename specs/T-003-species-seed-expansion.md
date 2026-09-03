# T-003 — Expand species seed data to 150

**Phase 0 · Depends on: nothing (can run alongside T-001/T-002) · Size: 2–3 days**

## Goal

Grow `data/species.seed.json` from 30 entries to 150, keeping the same schema, sourcing discipline and honesty about disagreement.

## Why

Missing species is the single most repeated complaint across both competitors. Principle 03 means the app never says "not found" — but a generated provisional card is a fallback, not a substitute. The more species that are properly sourced from the start, the fewer users meet an unverified card in their first session.

150 covers essentially everything sold in Indian and Western beginner shops.

## In scope

- Extend to 150 entries following the priority order in `data/README.md`, India-first.
- Same schema exactly. Same sourcing rules: at minimum two real fetched source URLs per entry, preferring Seriously Fish, then Aquarium Co-Op, then Practical Fishkeeping.
- **Where sources disagree, record a range spanning the reputable positions and fill the `disputed` field.** Never pick one number and present it as settled. This is the failure that earned Aquareka reviews like *"Goldfish need 70L not 57L."*
- Err toward the larger reputable minimum tank size. Under-specifying kills fish.
- All entries `verified: false`. Human verification is a separate step.
- Add common Indian shop names to `common_names_in` — the same fish is sold under different names here and search must find it.
- Include common aquarium plants as `category: "plant"` entries, since the plants module needs them.
- A validation script that checks schema conformance, enum validity, min ≤ max on every range, no duplicate ids, and that the file parses.

## Out of scope

Human verification of care parameters. Dex card artwork. Anything reef or marine.

## Priority order for the additional 120

1. Remaining common Indian shop fish — more barbs, more gouramis, more danios and rasboras, goldfish varieties, koi, common cichlids sold locally, more livebearer strains, the loaches and sharks sold as algae eaters.
2. Common aquarium plants — anubias, java fern, cryptocoryne varieties, vallisneria, amazon sword, hornwort, java moss, bucephalandra, stem plants.
3. Remaining common Western beginner fish, so the app is not obviously India-only.
4. More invertebrates — shrimp colour strains, more snail species.

## Acceptance criteria

1. `data/species.seed.json` contains 150 entries and parses as valid JSON.
2. The validation script runs clean.
3. Every entry has at least two source URLs, and spot-checking five of them shows real pages that support the numbers recorded.
4. Every entry has `verified: false`.
5. At least 30 entries have a filled `disputed` field — if fewer, the sourcing was not sceptical enough.
6. Searching a common Indian shop name (for example "sucker fish", "shark", "flying fox") finds the right entry.

## Notes for Claude Code

Work in batches of 20 and validate after each batch, so a schema mistake does not propagate through 120 entries. Flag anywhere the popular hobby consensus looks dangerous — the first 30 turned up several, including neon tetras being widely sold for 28°C when the rigorous source caps them at 25°C, and rosy barbs being subtropical fish routinely sold into tropical tanks.
