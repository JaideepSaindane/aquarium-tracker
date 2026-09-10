# AquaAI species database

`species.seed.json` — 1,484 species (1,331 fish, 134 plants, 11 snails, 8 shrimp) grounding AI care advice.
Rebuilt 2026-09-10 from the `aquarium-species-db` pipeline: names resolved against GBIF + iNaturalist, per-field provenance, taxon-anchored photos.
All 445 previous ids are unchanged — livestock references and Dex unlocks survive.
Wrong numbers here kill fish. Treat every value as provisional until a human verifies it.

## Schema

| Field | Notes |
|---|---|
| `id` | kebab-case slug, stable forever. Referenced by `incompatible_with`. Never renumber or reuse. **Ids are common-name kebab-case slugs, not scientific-name slugs** — see below. |
| `scientific_name` | `Genus species`. Use `Genus cf. species` when the trade name covers an unresolved complex (e.g. `Ancistrus cf. cirrhosus`). |
| `common_names` | Primary name first — that is what the UI shows. |
| `common_names_in` | Names used in Indian shops. Empty array if identical to `common_names`. Feeds search, not display. |
| `category` | `fish` / `shrimp` / `snail` / `crayfish` / `plant`. Matches the `species.category` enum in `docs/02-data-model.md` and the plant entries required by `specs/T-003`. All categories except `crayfish` are populated in the current seed. |
| `verified` | **Always `false` on write.** Only a human reviewer may flip it. |
| `source_refs` | ≥2 URLs that were actually fetched and read. Not "a Google result". |
| `temp_c` | Long-term healthy range, not survival tolerance. Where sources differ, span both and explain in `disputed`. |
| `ph` / `hardness_dgh` | Same rule. Hardness in dGH; convert ppm ÷ 17.86. Seriously Fish publishes ppm. |
| `adult_size_cm` | Realistic adult size in a good aquarium, using total length where sources give it. Prefer the **larger** cited figure. |
| `min_volume_l` | Litres for the minimum recommended group of that species. See sizing rule below. |
| `min_footprint_cm` | **Load-bearing field.** Tank base length × width. For bottom-dwellers, active swimmers and territorial fish this constrains stocking more than volume does — a 100 L cube is wrong for a zebra danio and right for an angelfish. Derived from Seriously Fish base dimensions where available. |
| `social_min_group` | Minimum individuals of the *same* species. `1` means genuinely solitary or must-be-solitary. |
| `temperament` | `peaceful` / `semi-aggressive` / `aggressive` / `territorial`. `territorial` = aggression is directed at conspecifics or a defended area, not the whole tank. |
| `swim_level` | `top` / `mid` / `bottom` / `all`. |
| `diet` | `omnivore` / `herbivore` / `carnivore`. Detail belongs in `care_notes`. |
| `difficulty` | Reflects *what it takes to keep the animal alive for its full lifespan*, not how cheap or common it is. Otos and dwarf gouramis are sold as beginner fish and are not. |
| `lifespan_years` | Well-kept captive lifespan. Numbers may be fractional. |
| `breeding` | `egglayer` / `livebearer` / `mouthbrooder` / `bubble-nester` / `difficult-in-aquarium`. For *Neocaridina*, `livebearer` denotes direct development (no larval stage). |
| `care_notes` | 2–4 sentences, plain language, the facts that change a decision. No filler. |
| `common_mistakes` | Specific and falsifiable. "Sharp gravel erodes barbels", not "poor care". |
| `incompatible_with` | Species `id`s, or keywords from the closed list below. Keep the list closed; add a keyword only together with a matching resolver in the compatibility engine. See "The `incompatible_with` vocabulary" below for the full list and the rule for unrecognised values. |
| `disputed` | Optional; present on 32 of the 1,484 entries. Name the sources and both numbers. This is the honesty surface of the product. |
| `dex` | `rarity` (`common`/`uncommon`/`rare`) and `tier` (1 easy, 2 needs planning, 3 large/demanding). Gamification only — never used for care advice. |

## Species id convention

**Ids are common-name kebab-case slugs, not scientific-name slugs.** The slug is built from the primary entry in `common_names`, lowercased, with spaces and punctuation replaced by hyphens.

- `neon-tetra` — **not** `paracheirodon-innesi`
- `amano-shrimp` — **not** `caridina-multidentata`

This is stated explicitly because other documents in the project guessed the scientific-name form and cite species as `species:paracheirodon-innesi`. Those refs are wrong; the ids in `species.seed.json` are correct and are treated as stable. Citations elsewhere are what get corrected, not the seed.

Disambiguate with a qualifier rather than falling back to the scientific name where two common names collide: `goldfish-fancy`, `rainbow-shark`, `red-tail-shark`. Where the trade name is genuinely ambiguous, the `scientific_name` field carries the precision — that is what it is for.

## The `incompatible_with` vocabulary

Every value in `incompatible_with` is either a **species `id` that exists in this file**, or a **keyword from this closed list**. There is no third option.

**Trait keywords** — the conflict is about a characteristic, not a species:

`long-finned`, `fin-nipper`, `slow-swimmer`, `boisterous`, `bottom-dweller`, `slow-flat-bodied`, `large-cichlid`, `shrimp`, `sharp-substrate`, `copper-medication`, `soft-water-species`, `tropical-species`

**Group keywords** — the conflict is with a group of species. Each resolves to a set, and each needs its resolver written before the compatibility engine can use it:

| Keyword | Resolver rule |
|---|---|
| `discus` | Resolves to *Symphysodon* spp. The resolver matches any species whose `id` or `scientific_name` is a *Symphysodon*; the conflict is the 28–30 °C requirement plus low tolerance for boisterous tankmates. |
| `loach` | Resolves to the loach families — Botiidae, Cobitidae, Nemacheilidae (kuhli, yoyo, zebra and clown loaches are all in the seed). Matches any species whose `category` is `fish` and whose family is one of those three. The conflict is scaleless-fish medication sensitivity and sharp-substrate barbel damage. |
| `puffer` | Resolves to Tetraodontidae. Matches on family. The conflict is fin-nipping and predation on shrimp and snails — treat as incompatible with everything soft-finned or invertebrate until a specific pairing is verified. |
| `assassin-snail` | Resolves to *Clea helena*. A single species, in the seed. The conflict is predation on other snails, so it resolves as incompatible with `category: snail`. |
| `red-tail-shark` | Resolves to *Epalzeorhynchos bicolor*. A single species, not in the seed yet. Distinct from the seeded `rainbow-shark` (*E. frenatum*) — do not merge them. The conflict is territorial aggression toward similar-shaped bottom-dwellers. |

Where a group keyword names a species that later gets its own seed entry, the keyword stays valid — it keeps resolving to the whole group, and the new `id` becomes one member of that group. Do not rewrite existing `incompatible_with` values when a species is seeded.

**Unrecognised values.** A value that is neither a species `id` in this file nor a keyword above is a **build error, not a runtime fallback**. The seed validator fails the build and names the offending value and entry. It is never silently dropped, never fuzzy-matched to a similar id, and never passed through to the compatibility engine, because a silently dropped incompatibility reads to the user as "these are fine together" — the exact failure mode this field exists to prevent. To introduce a new value, add it to one of the two lists above with its resolver in the same change.

## Sourcing rules

Trust order: **Seriously Fish → FishBase → Aquarium Co-Op → Practical Fishkeeping / TFH.**

1. Fetch and read the page. Never cite a URL you have not opened.
2. Where sources disagree, record a **range spanning the reputable positions** and write a `disputed` note naming who says what. Never split the difference silently and never present false precision.
3. **Tank size: err toward the larger reputable figure.** Under-specifying kills fish. Where Seriously Fish gives base dimensions, carry them into `min_footprint_cm` verbatim — that data is what competitors lack.
4. Exception, documented per entry: for shrimp and snails the limiting factor is water stability and minerals, not litres, so `min_volume_l` uses a practical floor with the range in `disputed`.
5. Prefer the source that gives *dimensions* over the source that gives only gallons.
6. Note stock-quality and taxonomy problems explicitly (dwarf gourami iridovirus, hormone-treated rams, "kuhli loach" being *P. semicincta*, "mystery snail" being *P. diffusa*). These are care-relevant, not trivia.
7. India-specific reality goes in `care_notes` where it matters: goldfish and rosy barbs are subtropical and suffer in a 32 °C flat; ram cichlids need 27–30 °C and thrive there.

## Expanding 30 → 150

India-first, then global beginner coverage. Add in blocks; each block is a shippable release.

**31–55 · Indian shop staples missing from the seed.** Red-tail black shark, gold barb, Odessa barb, black widow/skirt tetra, serpae tetra, silver/black-skirt "widow" variants, glowlight tetra, rummynose tetra, silver dollar, bala shark, oscar, flowerhorn, red parrot cichlid, convict cichlid, koi, common/comet goldfish, giant danio, glass catfish, black ghost knife, tinfoil barb, sucker-mouth "algae eater" (*Gyrinocheilus aymonieri*), zebra loach, yoyo loach, dwarf/Indian gourami (*Trichogaster fasciata*), climbing perch. Several of these are mis-sold traps — the `disputed` and `common_mistakes` fields matter most here.

**56–85 · Native South Asian species.** *Pethia padamya*, *P. ticto*, *Puntius sophore*, *Devario aequipinnatus*, *Danio dangila*, *Badis badis*, *Dario dario* (scarlet badis), *Laubuka* spp., *Botia almorhae*, *B. striata*, *Nemacheilus*/*Schistura* loaches, *Etroplus maculatus* (orange chromide), *Channa* dwarf species, *Macropodus opercularis*, hill-stream *Sewellia*/*Gastromyzon*. High local availability, near-zero good English care data — this is where the app can be genuinely better than everyone else.

**86–115 · Global beginner/intermediate community fish.** Remaining tetras and rasboras (black neon, lemon, congo, chili rasbora, espei), *Corydoras* (panda, sterbai, pygmy, julii/trilineatus), *Pangio* species, remaining *Ancistrus*, common *Hypancistrus* (L134, L260), apistogramma (cacatuoides, agassizii), kribensis, bolivian ram, keyhole cichlid, remaining gouramis (three-spot, sparkling, croaking, chocolate), white cloud mountain minnow, platies/swordtail colour forms, killifish (*Aplocheilus lineatus* — native to India), rainbowfish (boesemani, praecox).

**116–150 · Inverts, oddballs, and the "do not buy" set.** Caridina (crystal red, blue bolt), bamboo/vampire shrimp, ghost shrimp, assassin snail, ramshorn, malaysian trumpet, rabbit snail, dwarf crayfish (*Cambarellus*), *Procambarus clarkii*, african dwarf frog, and the fish that need a loud warning entry: iridescent shark, red-tail catfish, pacu, arowana, tiger shovelnose, clown loach, discus.

## Verification workflow

Nothing ships to users with `verified: false` presented as fact — the app must label unverified entries and prefer ranges.

1. **Assign.** One reviewer per entry, recorded outside this file (`verification.log.jsonl`, not in the seed).
2. **Re-fetch every `source_refs` URL** and confirm each number actually appears there. Broken or paywalled link → replace it, don't drop below two.
3. **Check the four killers first:** `min_volume_l`, `min_footprint_cm`, `temp_c`, `social_min_group`. A wrong footprint or a wrong group size is what earns the 1-star review.
4. **Confirm the `disputed` note** names real, current positions. If sources have converged since, rewrite it; if a new disagreement exists, add it.
5. **Sanity-check against a keeper**, ideally an Indian retailer or club member, for anything in the India-first blocks.
6. **Sign off**: set `verified: true` and append `{id, reviewer, date, sources_checked, changes}` to `verification.log.jsonl`. Never flip `verified` in a bulk edit or a script.
7. **Re-verify** on a 12-month cycle, or immediately when a source updates its profile or a user reports a discrepancy.

## Provisional entries (user-submitted and AI-generated)

**There are two tracks, and they are not the same thing.** A generated species is never blocked from the user (Principle 03), and it is never promoted into the seed without a human. Those two facts live in two different places:

| | Running app (device / production DB) | This repository (offline) |
|---|---|---|
| **Where** | The `species` table, per `docs/02-data-model.md` | `species.provisional.json` |
| **Written by** | The app, the moment `species-gen/v1` returns a card | A human or a harvest job, pulling generated and user-submitted entries out of production |
| **Fields** | `origin: 'ai_generated'` (or `'user'`), `verified: false` | Full seed schema plus the provisional-only fields below |
| **Purpose** | The user gets a usable card immediately, badged unverified | The review queue: entries staged for human verification before promotion |
| **Exit** | Stays until a verified value supersedes it | Promoted into `species.seed.json` with `verified: true`, or `merge_status: "rejected"` |

So: **in the running app**, generated species are written to the `species` table with `origin: 'ai_generated'` and `verified: false` — never held back, never queued behind a human. **In this repository**, `species.provisional.json` is the offline review queue where entries harvested from production are staged for human verification before being promoted into `species.seed.json` with `verified: true`. Nothing enters `species.seed.json` except by promotion through that queue, which is what "never in the seed" was reaching for.

Provisional entries use the same schema plus:

```
"provenance": "user" | "ai",
"submitted_by": "<user id or model+version>",
"submitted_at": "<ISO 8601>",
"confidence": "low" | "medium" | "high",
"merge_status": "pending" | "merged" | "rejected",
"duplicate_of": "<id, if it is an existing species under another name>"
```

Rules:

- Provisional entries are **always** `verified: false` and must render with a visible "unverified — community submitted" or "AI-generated draft" badge. AI-generated care numbers must never be presented in the same visual weight as verified ones.
- The AI advice layer may read provisional entries but must hedge, and must refuse to give a minimum tank size from an AI-generated entry alone. A missing answer is safer than a confidently wrong litre count.
- **Duplicate check first.** Most user submissions are an existing species under a local or trade name. If so, set `duplicate_of` and merge the new name into `common_names_in` rather than creating an entry — this is how the Indian-shop name coverage should grow.
- **Merge criteria:** ≥2 fetched reputable sources; all four killer fields present; a human reviewer has run the verification workflow above. Then move the entry into `species.seed.json`, set `verified: true`, drop the provisional-only fields, and log it. Promotion into the seed is the only path by which `verified` becomes `true`.
- **Reject** entries that cannot reach two reputable sources, and tell the submitter why. Keep the rejection in the provisional file with `merge_status: "rejected"` so the same species is not re-litigated every month.
- Never let a merge silently overwrite a verified value. If a submission contradicts a verified entry, it opens a re-verification, not an edit.
