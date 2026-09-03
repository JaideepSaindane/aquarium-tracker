# 05 — Content Grounding Guide

**Status:** working document · **Owner:** content lead · **Applies to:** every AI-generated answer in AquaAI

---

## 1. Why this corpus exists

The model is not the moat. Any competitor can call the same API next week. What they cannot copy in a week is a hand-written, human-reviewed, India-aware body of fishkeeping knowledge with named reviewers and dated sources against it.

The model is also not trustworthy on care advice. An ungrounded LLM will produce fluent, confident, wrong instructions — a salt dose that kills a tank of Corydoras, a temperature raise that finishes off a fish already hypoxic, a medication stack that strips the biofilter and converts a treatable parasite problem into an ammonia kill. It does this in the same tone it uses when correct. Users cannot tell the difference. Fish die in hours, not weeks.

So the rule is structural, not advisory:

1. **Every AI answer must retrieve from this corpus.** No retrieval hit above the relevance threshold → the app says it does not have grounded guidance on this and routes to the "ask a human" path. It does not improvise.
2. **Every answer cites what it used** — visible entry titles, linked. The user can check our work, and so can we when an answer goes wrong.
3. **Retrieved content outranks model priors.** Where the corpus and the model disagree, the corpus wins, including when the corpus says "we don't know."
4. **The corpus is versioned and attributed.** Each entry names who reviewed it and when. An entry with no reviewer is not eligible for retrieval — it does not ship.

**What rule 1 does and does not forbid.** "Does not improvise" is a rule about *care advice*, not about every sentence the app is allowed to say. There are exactly three cases, and they are decided by the question, not by how confident the model feels:

- **(a) Safety-critical question, no corpus hit → no answer.** Anything where being wrong can harm an animal: symptoms, diagnosis, treatment, water parameters, stocking, acclimation, equipment failure, emergencies. If nothing clears the relevance threshold, the app says it does not have grounded guidance on this, offers the "ask a human" path, and offers to write the topic up. It does not answer from general knowledge, and it does not answer "in general terms" as a compromise.
- **(b) General hobby question that is not safety-critical → may be answered from general knowledge, clearly labelled.** Questions about how a thing works, what a term means, or what a piece of gear does — "what does a sponge filter do", "what does GH mean", "why is my driftwood staining the water brown". These may be answered from general knowledge, and the answer must carry a visible marker that it is not corpus-grounded (`uncovered: true`, no `grounding_refs`, and the "not from our reviewed corpus" note rendered with it). No dose, no parameter target, and no course of action may appear in a case-(b) answer; the moment one is needed, it becomes case (a).
- **(c) Medication, dosing, disease, or a specific care parameter → always case (a), never case (b).** If the question names or implies a drug, a chemical, a dose, a disease, a symptom, or a number the user would set or act on (temperature, pH, ammonia, GH, KH, tank size, group size, water-change size), it is case (a) even when it looks casual and even when the answer seems obvious. There is no "but this one is easy" exception.

The test to apply, in order: *could a wrong answer here hurt a fish?* If yes → (a). *Does it involve a drug, a dose, a disease, or a number the user will act on?* If yes → (a), regardless of the first answer. Otherwise → (b), labelled.

The corpus is the product's safety floor and its defensibility at the same time. Treat edits to it with the seriousness of a code change to a payments system.

---

## 2. The 62 risk topics

These 62 must be hand-written and human-reviewed **before any AI feature is exposed to users**. They are chosen because each one either (a) kills fish within hours if handled wrong, or (b) is a topic where the common internet answer is actively harmful.

*(This list was originally 60. It is 62 because the pH–ammonia trap and the nitrogen-cycle explainer were split out of the ammonia and cycling entries into topics of their own — both are cited by id from other documents and each needs to resolve to a single retrievable entry.)*

**Every topic has a canonical `id`.** The `id` column below is the stable kebab-case slug used in the entry's frontmatter, in `grounding_refs` as `corpus:<id>`, in analytics and in user-facing reports. Ids are immutable: never renamed, never reused, never renumbered even if the topic's position in this list changes.

### A. Water chemistry emergencies (1–9)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 1 | `ammonia-spike` | Ammonia spike (acute) | Kills within hours; toxicity depends on pH and temperature, so the test number alone misleads. |
| 2 | `ph-ammonia-trap` | pH–ammonia trap (low pH + accumulated ammonia) | The "helpful" large water change with higher-pH water flips stored NH4+ to free NH3 in minutes and kills fish that were surviving. Own entry because it is cited on its own from the triage contract. |
| 3 | `nitrite-spike` | Nitrite spike | Causes methaemoglobinaemia ("brown blood"); fish suffocate in oxygen-rich water and owners misdiagnose it as low oxygen. |
| 4 | `nitrate-creep` | Nitrate creep | Slow, invisible, blamed on everything else; drives chronic illness and stunting. |
| 5 | `ph-crash-kh-exhaustion` | pH crash / KH exhaustion | Overnight collapse in soft-water tanks; the "fix" (adding buffer fast) can be more lethal than the crash. |
| 6 | `old-tank-syndrome` | Old tank syndrome | Fish adapted to bad water; a large "helpful" water change causes fatal osmotic and pH shock. |
| 7 | `chlorine-chloramine-poisoning` | Chlorine and chloramine poisoning | Common with municipal supply; chloramine needs a dechlorinator that also binds ammonia, which most users don't know. |
| 8 | `tds-gh-kh-mismatch` | TDS / GH / KH mismatch and osmotic shock | RO, borewell and tanker water vary wildly across Indian cities; shrimp and soft-water fish die from swings, not absolute values. |
| 9 | `heavy-metals-tap-water` | Heavy metals and contaminated tap water | Copper/brass plumbing, first-draw water, and "purifier reject" water; lethal to inverts at concentrations invisible to fish. |

### B. The nitrogen cycle and cycling failures (10–15)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 10 | `nitrogen-cycle` | The nitrogen cycle (how it works) | The explainer every other cycling answer is built on: ammonia → nitrite → nitrate, what the bacteria need, and how long it takes. Own entry because it is the default grounding ref for cycling questions. |
| 11 | `fishless-cycling` | Fishless cycling | The safe default; most Indian retail advice still sells fish on day one. |
| 12 | `fish-in-cycling` | Fish-in cycling (rescue protocol) | Where most beginners actually are; needs a damage-limitation protocol, not a lecture. |
| 13 | `stalled-cycle` | Stalled cycle | Misdiagnosed constantly; causes are pH<6.5, chlorine, medication, no ammonia source — each needs a different fix. |
| 14 | `cycle-crash` | Cycle crash | Over-cleaning media, tap-rinsing sponges, antibiotic dosing, or a long power cut kills the biofilter silently. |
| 15 | `bottled-bacteria-claims` | Bottled bacteria and "instant cycle" claims | Widely oversold; users skip testing because they believe the bottle. |

### C. Parasitic and protozoan disease (16–22)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 16 | `ich-white-spot` | Ich / white spot | Most common killer; only the free-swimming stage is treatable, so protocol length matters more than product choice. |
| 17 | `velvet-piscinoodinium` | Velvet (*Piscinoodinium*) | Faster and deadlier than ich, easily missed until gills are destroyed; needs darkness plus treatment. |
| 18 | `gill-flukes` | Gill flukes (*Dactylogyrus*) | No external signs beyond gasping and flared gills; routinely misdiagnosed as low oxygen or ammonia. |
| 19 | `skin-flukes-and-crustacean-parasites` | Skin flukes and crustacean parasites (*Gyrodactylus*, anchor worm, fish lice) | Manual removal advice causes injury; wrong drug class does nothing. |
| 20 | `internal-worms` | Internal worms (*Camallanus*, *Capillaria*) | Visible red worms panic users into salt/heat, which do nothing; needs a specific dewormer course with a repeat. |
| 21 | `hexamita-hole-in-the-head` | Hexamita / hole-in-the-head | Confounded with lateral line erosion from bad water and diet; treated with antibiotics that don't touch it. |
| 22 | `invisible-protozoa` | Invisible protozoa (*Costia*, *Chilodonella*, *Trichodina*) | Cause flashing, clamped fins and mucus with nothing to see; drive blind medication stacking. |

### D. Bacterial, fungal and other disease (23–30)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 23 | `fin-rot` | Fin rot | Almost always a water-quality symptom; treating with antibiotics first ignores the actual cause. |
| 24 | `columnaris` | Columnaris | Kills in 24–72 h; accelerates at high temperature, so the standard "raise the heat" reflex is lethal here. |
| 25 | `dropsy` | Dropsy | A sign, not a disease; near-universally terminal — the corpus must handle prognosis honestly and cover euthanasia. |
| 26 | `popeye` | Popeye | Unilateral (injury) vs bilateral (systemic/water) distinction changes treatment entirely. |
| 27 | `bacterial-ulcers-septicaemia` | Bacterial ulcers / haemorrhagic septicaemia | Red streaks and open sores; internal antibiotics needed, external dips waste the window. |
| 28 | `mycobacteriosis` | Mycobacteriosis (fish TB) | Untreatable, chronic, and **zoonotic** — the only topic with a human-health warning attached. |
| 29 | `saprolegnia-true-fungus` | True fungus (*Saprolegnia*) vs pseudo-fungus | Cotton-wool growths are usually columnaris, not fungus; antifungal treatment then fails while the fish dies. |
| 30 | `swim-bladder-and-bloat` | Swim bladder disorder and bloat | Umbrella symptom with causes from constipation to infection to genetics; "feed a pea" is applied to fish that are dying of something else. |

### E. Medications and treatments (31–43)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 31 | `aquarium-salt` | Aquarium salt (NaCl) | Dangerous to many catfish, loaches, most soft-water tetras, electroreceptive fish, plants and inverts; "salt is natural" is the most common fatal belief. |
| 32 | `methylene-blue` | Methylene blue | Stains and strips the biofilter; safe as a dip/hospital-tank drug, harmful as a display-tank drug. |
| 33 | `malachite-green` | Malachite green | Effective against ich; teratogenic to fish eggs, harmful to some inverts, and stains silicone/decor. |
| 34 | `formalin` | Formalin | Consumes dissolved oxygen and is acutely toxic on overdose; a serious human hazard in an unventilated Indian flat. |
| 35 | `copper` | Copper | Lethal to all invertebrates and snails at therapeutic dose; unpredictable in soft water; binds to substrate and leaches for months. |
| 36 | `praziquantel` | Praziquantel | Safe and broad, but ineffective against the parasites people most often assume it covers. |
| 37 | `levamisole-fenbendazole` | Levamisole and fenbendazole | Nematode-specific; fenbendazole kills snails and some inverts; dosing sourced from livestock products is a common overdose route. |
| 38 | `metronidazole` | Metronidazole | Requires medicated food to be useful for internal protozoa; water dosing is often wasted effort. |
| 39 | `antibiotics` | Antibiotics (kanamycin, erythromycin, nitrofurans, oxytetracycline) | Nuke the biofilter, drive resistance, are freely sold in India without diagnosis, and are usually the wrong first move. |
| 40 | `heat-treatment` | Heat treatment as therapy | Sources genuinely disagree on efficacy; raises oxygen demand and is fatal for cool-water species and columnaris cases. |
| 41 | `potassium-permanganate` | Potassium permanganate | Cheap and ubiquitous in India; extremely narrow safety margin, burns gills, and is inactivated by organics. |
| 42 | `medication-stacking` | Stacking multiple medications | The single most common way an owner kills a whole tank; interactions and cumulative oxygen demand. |
| 43 | `dose-calculation` | Dose calculation from actual water volume | Users dose on the box size of the tank, not the real volume after substrate, decor and low water line — routinely 20–35% over. |

### F. Environmental risk (44–51)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 44 | `temperature-swings` | Temperature swings | Rate of change matters more than the endpoint; suppresses immunity and triggers ich. |
| 45 | `heatwave-overheating` | Heatwave / summer overheating | Indian summers push unchilled tanks past 34 °C; oxygen falls exactly as demand rises. |
| 46 | `oxygen-depletion` | Oxygen depletion | Kills fastest of anything on this list; caused by heat, overstocking, medication, or a stopped filter overnight. |
| 47 | `power-cuts` | Power cuts | Routine in much of India; filter media goes anoxic, biofilter dies, and restart dumps ammonia into the tank. |
| 48 | `overfeeding` | Overfeeding | Root cause behind a large share of "my fish is sick" reports. |
| 49 | `overstocking` | Overstocking | Retail advice in India is aggressively wrong ("goldfish in a bowl"); drives every other failure mode. |
| 50 | `aggression-incompatible-stocking` | Aggression, bullying and incompatible stocking | Deaths get attributed to disease; the real cause is a tankmate or a wrong group size. |
| 51 | `jumping-carpet-surfing` | Jumping / carpet surfing | Entirely preventable; specific species need a lid named explicitly. |

### G. Equipment failure (52–56)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 52 | `heater-stuck-on` | Heater stuck ON | Cooks a tank in hours; needs an emergency cool-down protocol that doesn't shock the fish. |
| 53 | `heater-failed-off` | Heater failed OFF or undersized | Chronic chilling and immunosuppression; north Indian winters. |
| 54 | `filter-failure` | Filter failure and media handling | Restarting a filter that sat stopped for hours can dump toxic anoxic water into the tank. |
| 55 | `co2-overdose` | CO2 overdose | Silent suffocation in planted tanks; drops pH sharply at the same time. |
| 56 | `backsiphon-leaks-overflow` | Airline backsiphon, leaks and overflow | Property damage plus rapid water loss; a check valve is a one-line prevention. |

### H. Water changes and acclimation (57–59)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 57 | `water-change-basics` | Water change size, frequency and temperature matching | The most frequent user action and the most frequent way users hurt fish. |
| 58 | `acclimating-new-fish` | Acclimating new fish | Float-and-dump vs drip; bag water is high-ammonia and low-pH, and opening it wrong is what kills the fish. |
| 59 | `moving-a-tank` | Moving or transporting a tank | Combines cycle crash, temperature swing and transport stress in one event. |

### I. Quarantine (60–62)

| # | `id` | Topic | Why high-risk |
|---|---|---|---|
| 60 | `quarantine-setup` | Quarantine tank setup and duration | The single highest-leverage habit; almost no Indian hobbyist does it. |
| 61 | `prophylactic-quarantine-treatment` | Prophylactic treatment during quarantine | Where blanket medicating is defensible — and where it is not. |
| 62 | `disease-vectors-equipment` | Plants, snails and shared equipment as vectors | Nets, siphons and plant bags move ich, flukes and snails between tanks invisibly. |

### 2.1 Where these live on disk

- **One file per entry:** `content/corpus/<id>.md`, where `<id>` is exactly the slug in the table above. `content/corpus/ich-white-spot.md`, `content/corpus/ph-ammonia-trap.md`, and so on. The filename and the `id` in the frontmatter must match; the build fails if they do not.
- **Frontmatter:** exactly the template in §3. Body prose follows the closing `---`.
- **Trait vocabulary:** `content/schema/traits.yml`. This is the fixed vocabulary referenced by `applies_to.species_traits` in §3.
- **Citations:** an entry is referenced everywhere else in the project as `corpus:<id>` — for example `corpus:ammonia-spike` in a `grounding_refs` array. A `corpus:` ref that does not resolve to a file in `content/corpus/` is a build error, not a warning.

(These files do not exist yet. This subsection fixes the convention so that the ids cited from `docs/03-ai-contracts.md` and elsewhere have somewhere to resolve to.)

---

## 3. Entry template

Every corpus entry is one markdown file with YAML frontmatter. Files that fail schema validation are rejected at build time and never enter the retrieval index.

```markdown
---
id: ich-white-spot                      # stable kebab-case slug; never reused, never renamed
title: Ich / White Spot Disease         # human title, shown as the citation label
aliases:                                # everything a real user might type
  - white spot
  - ick
  - safed daane
  - machhli pe safed spots
  - "namak se ich"
severity: high                          # low | medium | high | critical
time_to_act: 24h                        # now | 24h | 72h | 1w | routine
applies_to:                             # retrieval filters; omit a key = applies to all
  water_type: [freshwater]
  species_traits: [scaleless, soft_water, invert, plant, cool_water]
  excludes: []
symptoms: []                            # observable signs, user-language first
likely_causes: []                       # ranked most→least likely
immediate_actions: []                   # ORDERED. Step 1 is what to do in the next 10 minutes.
do_not_do: []                           # explicit prohibitions with the reason attached
when_to_escalate: ""                    # what makes this a vet / experienced-keeper case
treatments:                             # array; each option carries its own danger list
  - name: ""
    dose: ""
    duration: ""
    dangerous_to: []                    # species/trait list — REQUIRED, never empty-by-default
    notes: ""
    source: ""                          # URL for this specific dose
sources: []                             # URLs backing the entry as a whole
confidence: high                        # high | medium | contested
last_reviewed_by: ""                    # named human, not a team
last_reviewed_on: 2026-08-30            # ISO date
review_due: 2027-02-28
---

Body: 150–400 words of prose the model can quote from. Plain, specific, no filler.
```

### Field definitions

| Field | Purpose | Rules |
|---|---|---|
| `id` | Stable identifier used in citations, analytics and user reports. | Immutable. If a topic splits, create new ids and leave a redirect stub. |
| `title` | What the user sees in "Sources" under an answer. | Must be recognisable to a novice, not a clinician. |
| `aliases` | Retrieval recall. This is where Hinglish, misspellings and street names live. | Minimum 5. Include Latin-script Hindi (`safed daane`, `paani kharab`), common misspellings (`ick`, `amonia`), and Indian retail names for products. |
| `severity` | Drives UI treatment (banner colour, interruption). | `critical` = fish can die today. |
| `time_to_act` | Drives the first line of the answer. | Distinct from severity: mycobacteriosis is `critical` severity but `routine` time_to_act. |
| `applies_to` | Hard filter, not a hint. If the user's tank has shrimp, copper entries are demoted and their danger lines are promoted. | Traits come from a fixed vocabulary in `content/schema/traits.yml` (see §2.1). |
| `symptoms` | Matches against user description and photo classifier output. | Phrase as a user would ("fish is rubbing on gravel"), not as a text-book would ("pruritus"). |
| `likely_causes` | Forces the answer to address cause, not just symptom. | Ranked. Include the boring cause (water quality) even when a dramatic one exists. |
| `immediate_actions` | The ordered list the app renders as the primary answer. | Step 1 must be safe with zero further information. Testing before treating is almost always step 1 or 2. |
| `do_not_do` | The highest-value field in the schema. | Each item = prohibition **plus** the reason. "Do not X" alone is ignored by users; "Do not X, because Y dies" is not. |
| `when_to_escalate` | Honest limits. | Must include the "we cannot tell you this from here" cases. |
| `treatments[]` | Options with per-option risk. | `dangerous_to` may never be omitted or left empty as a shortcut. Write `dangerous_to: [none_known]` explicitly if that is truly the case, and cite it. |
| `sources[]` | Provenance. | Every dose and every medical claim needs a URL. Forum posts are not sources; they may be listed under `notes` as "hobby practice, unverified". |
| `confidence` | Signals to the model how firmly to speak. | `contested` forces the answer to present a range and say sources differ. |
| `last_reviewed_by` | Accountability. | A person's name. Never "content team". |
| `last_reviewed_on` / `review_due` | Freshness gating. | Past `review_due` → entry is flagged in-app as "under review" and demoted in retrieval. |

---

## 4. Two fully worked examples

These are the reference standard. Everything else should be written to this level of specificity.

---

### 4a. Ich / White Spot Disease

```markdown
---
id: ich-white-spot
title: Ich / White Spot Disease (Ichthyophthirius multifiliis)
aliases:
  - ich
  - ick
  - white spot
  - whitespot
  - safed daane
  - machhli pe safed spot
  - suji jaisa daana
  - salt grain spots on fish
  - fish rubbing on gravel
  - flashing
severity: high
time_to_act: 24h
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - White spots the size of a grain of sugar/suji on fins and body, raised, not fuzzy
  - Flashing — rubbing against gravel, rocks, heater, filter intake
  - Clamped fins, hiding, reduced appetite
  - Rapid gill movement or gasping at the surface (gill infection — worse prognosis)
  - Spots that disappear for a day and return in greater numbers (parasite has dropped off to reproduce)
likely_causes:
  - Newly added fish or plants introduced without quarantine (most common)
  - Temperature drop or swing suppressing immunity (power cut, winter, large cold water change)
  - Chronic stress from poor water quality, overstocking or bullying
  - Shared net/siphon between an infected tank and a clean one
immediate_actions:
  - Test ammonia, nitrite, nitrate and temperature BEFORE dosing anything. Ich thrives on stressed fish; if ammonia or nitrite is above 0 you are treating two problems and the water is the more urgent one.
  - Treat the entire tank, not the spotted fish. By the time spots are visible the free-swimming stage is throughout the water column.
  - Remove activated carbon and any chemical filtration media. Carbon strips medication and makes the dose meaningless. Leave the biological media alone.
  - Increase aeration — add an airstone or lower the outflow to break the surface. Every ich treatment (heat, salt, malachite green, formalin) reduces available oxygen.
  - Choose ONE treatment from the options below and complete the full course. Do not switch products mid-course.
  - Continue treatment for a minimum of 3 doses at 24–48 h intervals in warm water, and for a full 7 days or 3 days past the last visible spot, whichever is later.
do_not_do:
  - Do not stop when the spots disappear. Only the free-swimming tomite stage is killed by chemicals; the encysted stage on the fish and the reproductive cyst in the substrate are untouched. Stopping early is the single most common cause of a "resistant" second outbreak.
  - Do not dose two medications at once, or a medication plus salt plus a big heat raise. Cumulative oxygen demand and liver load kill more fish than the parasite does.
  - Do not use aquarium salt if the tank contains Corydoras or other small catfish, most loaches (kuhli, yoyo, clown), electroreceptive fish (elephant nose, black ghost knife), soft-water tetras, live plants, shrimp or snails. Salt tolerance varies sharply by species and these groups are at the intolerant end.
  - Do not raise the temperature for cool-water species — goldfish, White Cloud Mountain minnows, hillstream loaches — or for any fish already gasping. Heat cuts dissolved oxygen precisely when a gill-infected fish needs it most.
  - Do not raise temperature at all if you suspect columnaris (white/grey fuzzy patches, saddle lesions, rapid deterioration) rather than ich. Columnaris accelerates with heat and can kill a tank in 48 hours.
  - Do not use copper-based medication in a tank with any shrimp, snail or other invertebrate — it is lethal to them at therapeutic dose, and it binds to substrate and leaches for months afterwards.
  - Do not halve the dose "to be gentle" on sensitive fish. A sub-therapeutic dose does not kill the parasite and prolongs exposure. If a fish cannot tolerate the full dose, choose a different treatment.
  - Do not scrape or wipe spots off the fish. The cysts are under the epidermis; scraping causes open wounds and secondary bacterial infection.
  - Do not rely on UV or "ich-eating" additives as the sole treatment during an active outbreak.
when_to_escalate:
  - Fish gasping at the surface with few or no visible body spots — likely gill infestation, poor prognosis, needs faster intervention and maximum aeration.
  - No improvement after 5 days of a correctly dosed treatment — the diagnosis is probably wrong (velvet, Costia, Chilodonella all look similar and are not the same parasite).
  - Marine tank — this entry does not apply. Marine white spot is Cryptocaryon irritans, a different organism with a different life cycle and different treatment.
  - Deaths continuing after water parameters are confirmed clean and treatment is on schedule.
treatments:
  - name: Malachite green + formalin combination (e.g. Ich-X, Rid-Ich+)
    dose: Per manufacturer label — commonly 5 ml per 10 US gallons (~38 L). Calculate on actual water volume, not tank rating.
    duration: Every 24 h after a one-third water change, until spots are gone, then one further dose.
    dangerous_to: [fish_eggs, some_inverts_check_label, silicone_and_decor_staining]
    notes: Widely used by public aquaria. On scaleless fish, shrimp and snails the claim to carry is about TOLERANCE, not efficacy — see the malachite green ruling in §6. Verify the specific product before dosing, since formalin content varies between brands. Reduces dissolved oxygen; aerate. Formalin is a human respiratory and carcinogenic hazard — dose in a ventilated room, never in a closed bathroom.
    source: https://www.aquariumcoop.com/blogs/aquarium/ich-treatment
  - name: Formalin (long-term bath, hospital tank)
    dose: 15 mg/L long-term immersion, or 250 mg/L short bath for 30–60 minutes
    duration: Repeat per life-cycle interval; minimum 3 treatments 2–3 days apart at 24–26 °C, 5 treatments 3–5 days apart at ~15 °C
    dangerous_to: [biofilter, low_oxygen_tanks, humans_inhalation]
    notes: Cannot be used with a biofilter — hospital tank only. Consumes oxygen heavily.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ichthyophthirius-multifiliis-White-Spot-Infections-in-Fish.pdf
  - name: Sodium chloride (aquarium/non-iodised salt), prolonged immersion
    dose: 0.05–0.2% (500–2,000 mg/L) prolonged immersion in a recirculating system. Some sources use up to 0.5% for tolerant species only.
    duration: Maintained through the outbreak, removed by successive water changes afterwards
    dangerous_to: [corydoras, loaches, kuhli_loach, most_tetras, electroreceptive_fish, live_plants, shrimp, snails]
    notes: CONTESTED. Extension aquaculture sources list salt as a valid ich control at these concentrations; other reviewers cite trials in which 0.25% salt had no measurable effect on ich and argue that only 0.5–0.75% does anything, which is above the tolerance of many community fish. Treat salt as a supportive measure for tolerant species (goldfish, most cichlids, livebearers), not as a reliable cure. UF/IFAS specifically notes tetras and electroreceptive fish such as elephant nose do not tolerate salt.
    source: https://ask.ifas.ufl.edu/publication/VM007/pdf
  - name: Temperature elevation
    dose: Raise to 28–30 °C (86 °F) at no more than 1–2 °C per day, only if every inhabitant tolerates it
    duration: Held for the duration of chemical treatment
    dangerous_to: [goldfish, white_cloud_minnow, hillstream_loach, cool_water_species, any_gasping_fish, columnaris_cases]
    notes: CONTESTED. Practical Fishkeeping and standard hobby practice recommend raising to ~30 °C to accelerate the life cycle so the vulnerable free-swimming stage is exposed to medication sooner. Extension guidance describes a cycling 32 °C/21 °C protocol for pet fish. Other reviewers state that controlled studies show heat alone is ineffective. AquaAI position: heat is an ADJUNCT that shortens the treatment window, never a standalone cure, and is contraindicated for cool-water species and gill-compromised fish.
    source: https://www.practicalfishkeeping.co.uk/features/how-to-solve-a-problem-like-whitespot/
  - name: Copper sulfate
    dose: Alkalinity-dependent; total alkalinity ÷ 100 = mg/L dose. Not usable below 50 mg/L alkalinity.
    duration: Every other day at 24–26 °C; every 4–5 days at ~15 °C
    dangerous_to: [all_invertebrates, shrimp, snails, soft_water_tanks_gh_under_4, plants]
    notes: Pond/aquaculture treatment. Not recommended for planted or invertebrate display tanks. Narrow margin between therapeutic and lethal in soft water.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ichthyophthirius-multifiliis-White-Spot-Infections-in-Fish.pdf
sources:
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ichthyophthirius-multifiliis-White-Spot-Infections-in-Fish.pdf
  - https://www.practicalfishkeeping.co.uk/features/how-to-solve-a-problem-like-whitespot/
  - https://www.aquariumcoop.com/blogs/aquarium/ich-treatment
  - https://ask.ifas.ufl.edu/publication/VM007/pdf
  - https://aquariumscience.org/index.php/10-2-2-ich/
confidence: contested
last_reviewed_by: ""
last_reviewed_on: 2026-08-30
review_due: 2027-02-28
---

Ich is a ciliate parasite with a three-stage life cycle, and only one of those stages can be killed. The
trophont is embedded under the fish's skin — that is the white spot you see, and it is protected there.
It drops off, becomes a tomont, and encysts on the substrate or decor, where it divides into hundreds of
free-swimming tomites. Only the tomites are susceptible to chemical treatment, and they have roughly
48 hours at 24–26 °C to find a host before they die.

Everything about correct ich treatment follows from that. You dose repeatedly, across several days,
because you are waiting for each wave of parasites to reach the one vulnerable stage. Spots vanishing
means the trophonts have dropped off to reproduce — it is the midpoint of the cycle, not the end of it.
The full cycle takes about 48 hours in warm water and stretches to a week or more near 15 °C, which is why
treatment intervals are temperature-dependent: roughly 3 doses 2–3 days apart at tropical temperature,
5 doses 3–5 days apart in cold water.

Raising temperature compresses the cycle and gets you to the vulnerable stage sooner. It does not itself
kill the parasite, and sources disagree sharply on how much it helps. It also lowers dissolved oxygen at
the moment a fish with infected gills can least afford it. Use it as an accelerator alongside a real
medication, in tanks where every inhabitant tolerates the temperature, with extra aeration running.

The tank is infected, not the fish. Treat all of it, for the full course.
```

---

### 4b. Ammonia Spike / New Tank Syndrome

```markdown
---
id: ammonia-spike
title: Ammonia Spike / New Tank Syndrome
aliases:
  - ammonia spike
  - amonia high
  - new tank syndrome
  - ammonia 2 ppm
  - paani kharab ho gaya
  - nayi tank mein machhli mar rahi hai
  - fish gasping at surface new tank
  - cloudy new tank fish dying
  - ammonia burn
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Gasping at the surface or hanging near the filter outflow
  - Red or inflamed gills; in bad cases gills look burnt or ragged
  - Lethargy, sitting on the bottom, refusing food
  - Clamped fins, darkened colour, red streaks on body or fins
  - In acute poisoning — spinning, disorientation, convulsions
  - Deaths in a tank set up within the last 6–8 weeks
likely_causes:
  - Tank cycled for less time than the biofilter needs (typically 4–8 weeks to establish)
  - Too many fish added at once, or added too soon after setup
  - Overfeeding, or an uneaten food/dead fish decomposing out of sight
  - Filter media rinsed in chlorinated tap water, or replaced entirely, killing the bacteria
  - Filter stopped for hours (power cut) and the media went anoxic
  - Antibiotic or medication course that wiped out the nitrifying bacteria
  - Chloramine in tap water dosed with a dechlorinator that does not bind the ammonia byproduct
immediate_actions:
  - Test ammonia, nitrite, nitrate, pH and temperature now. You cannot judge severity without pH and temperature — the same total ammonia reading is far more toxic at pH 8.2 than at pH 6.8, and more toxic warm than cool.
  - Stop feeding completely. Fish are safe unfed for several days; every gram of food added is more ammonia.
  - Check pH before choosing the water change size. If pH is at or above 7.0, do a water change of 50% or more with temperature-matched, fully dechlorinated water — this is the only action that reliably removes ammonia rather than masking it. If pH is below 7.0 AND total ammonia is at or above 0.5 ppm, do NOT do one large change with higher-pH water; do several small changes of 20–25% with pH-matched water instead (see corpus:ph-ammonia-trap). If pH is below 7.0 AND total ammonia is at or above 5 ppm, escalate: moving the fish to already-cycled, parameter-matched water is safer than changing water in place.
  - Dose a dechlorinator that also binds ammonia (Seachem Prime and equivalents) at label rate for the full tank volume. This converts free ammonia to a less toxic form for roughly 24–48 h; it buys time, it does not fix the cycle.
  - Increase aeration. Ammonia-damaged gills cannot extract oxygen efficiently, so raise surface agitation or add an airstone.
  - Re-test after 4–6 hours and repeat the water change if ammonia is still above 0.25 ppm total. Repeat daily until the biofilter catches up.
  - Do not add any more fish until ammonia and nitrite both read 0 for a full week.
do_not_do:
  - Do not do a single large water change with higher-pH water when pH is below 7.0 AND total ammonia is at or above 0.5 ppm. Raising pH converts stored ammonium (NH4+) into free ammonia (NH3) almost instantly and can kill fish that were surviving. Do several small changes of 20–25% with pH-matched water instead, and tell the user why you are doing it the slow way — the instinct to "just change more water" is exactly what kills the tank here. (See corpus:ph-ammonia-trap. Above 5 ppm total ammonia this escalates — see when_to_escalate.)
  - Do not treat with any medication. Ammonia poisoning is not an infection. Antibiotics will finish off whatever biofilter you have left and make the spike permanent.
  - Do not clean or replace the filter media. That is where your nitrifying bacteria live. If it is genuinely clogged, rinse it gently in water taken out of the tank — never under the tap.
  - Do not rely on ammonia-binding dechlorinator alone as the treatment. It is a holding measure of roughly 24–48 hours, its detoxifying claims are debated, and it does nothing to build the biofilter.
  - Do not use a total-ammonia test result as if it were a toxicity result. Report the number with pH and temperature or the advice is guesswork.
  - Do not add pH-up, buffers, or "ammonia remover" chemicals at the same time as a water change and a dechlorinator. Stacking changes makes the tank unstable in the direction you cannot predict.
  - Do not do a 100% water change on an established but neglected tank (see Old Tank Syndrome, id old-tank-syndrome) — fish adapted to chronically poor water go into osmotic shock.
  - Do not use a seeded sponge or media from a tank with any history of disease. You will transfer the disease along with the bacteria.
when_to_escalate:
  - pH below 7.0 AND total ammonia at or above 5 ppm — moving the fish to already-cycled, parameter-matched water is safer than changing the water in place (Merck). Escalate rather than water-changing.
  - Fish spinning, convulsing, or lying on their side — acute neurological toxicity, minutes matter.
  - Ammonia stays elevated after several large water changes — look for a decomposing source (dead fish behind rocks, dead snail, buried food) or chloramine in the supply.
  - Tap water itself tests positive for ammonia — common where chloramine is used; needs a different dechlorinator and confirmation testing before/after.
treatments:
  - name: Large water change with dechlorinated, temperature-matched water
    dose: 50% or more where pH is at or above 7.0; repeat as needed to hold total ammonia below 0.25 ppm. Where pH is below 7.0 and total ammonia is at or above 0.5 ppm, use several small 20–25% changes with pH-matched water instead.
    duration: Daily until the biofilter establishes
    dangerous_to: [old_tank_syndrome_tanks, ph_below_7_with_ammonia_at_or_above_0_5_ppm, unmatched_temperature]
    notes: The primary and safest intervention. Match temperature within about 1 °C. This is the only step that physically removes ammonia. Two-stage pH guard — pH below 7.0 with total ammonia at or above 0.5 ppm means small pH-matched changes only; pH below 7.0 with total ammonia at or above 5 ppm means move the fish to already-cycled matched water rather than changing water in place.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - name: Ammonia-binding water conditioner (Seachem Prime, Safe and equivalents)
    dose: Label rate for the full tank volume; some manufacturers permit up to 5x label dose in an emergency — confirm on the specific product
    duration: Roughly 24–48 h of protection per dose; not a substitute for water changes
    dangerous_to: [none_known_at_label_dose]
    notes: CONTESTED. Manufacturer claims of ammonia detoxification are debated in the hobby and in independent testing; treat it as a stopgap that buys hours, not a cure. Also note it can cause some ammonia test kits to read misleadingly. Does not remove nitrate.
    source: https://aquariumscience.org/index.php/5-5-3-2-1-prime-safe-and-ammonia/
  - name: Zeolite / ammonia-absorbing resin
    dose: Per product; place in filter flow
    duration: Until exhausted (days to weeks); must be replaced or regenerated
    dangerous_to: [planted_tanks_removes_nitrogen]
    notes: Physically removes ammonia. Removing it later can release ammonia back if not handled correctly. Delays the cycle by starving the bacteria of their food source.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
  - name: Seeded biological media from an established, disease-free tank
    dose: A used sponge, a handful of ceramic media, or a squeeze of established filter mulm
    duration: Single addition; the fastest legitimate way to shorten a cycle
    dangerous_to: [disease_transfer_risk, snail_and_pest_transfer]
    notes: More reliable than any bottled bacteria product. Source only from a tank you trust.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
  - name: Reduced or suspended feeding
    dose: Zero food for 2–4 days, then half rations
    duration: Until ammonia reads 0
    dangerous_to: [fry, very_small_species_with_high_metabolism]
    notes: Free, immediate, and effective. Adult fish tolerate a week without food; fry do not.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
sources:
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - https://aquariumscience.org/index.php/5-5-3-2-1-prime-safe-and-ammonia/
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-08-30
review_due: 2027-02-28
---

A test kit reports total ammonia nitrogen (TAN), which is the sum of two things: ammonium (NH4+), which is
comparatively harmless, and un-ionised ammonia (NH3), which is roughly a hundred times more toxic. What
splits the total between them is pH and temperature. Higher pH and higher temperature push the balance
toward NH3. This is why 1 ppm total ammonia in a soft, acidic, 24 °C tank is a manageable problem while
1 ppm in a hard, alkaline, 30 °C African cichlid tank is an emergency — and why any advice given from the
ammonia number alone is unreliable.

Reference points: un-ionised ammonia below 0.05 mg/L is generally considered non-harmful, gill damage
begins around that level, and 2 mg/L is lethal to many species. On total ammonia, freshwater fish should
be under 1 mg/L, with the practical aquarium target being zero. (AquaAI is freshwater-only; marine
figures are deliberately not carried here.)

New tank syndrome is the same problem with a known cause: the nitrifying bacteria that convert ammonia to
nitrite and nitrite to nitrate take about 4–8 weeks to establish, and fish added before then are living in
their own waste. There is no product that removes that requirement. Water changes and not feeding are what
carry the fish through it.

One trap deserves naming, and it has two stages. In a tank where pH has fallen and ammonia has
accumulated, most of the ammonia is sitting as relatively safe NH4+. Dumping in a large volume of
higher-pH tap water flips it to NH3 in minutes.

- **pH below 7.0 AND total ammonia at or above 0.5 ppm** — do not do a single large water change with
  higher-pH water. Do several small changes of 20–25% with pH-matched water, and explain to the user why:
  each small change removes ammonia without moving pH far enough to convert what is left into its toxic
  free form.
- **pH below 7.0 AND total ammonia at or above 5 ppm** — escalate. Moving the fish to already-cycled,
  parameter-matched water is safer than changing the water in place (Merck).

These two numbers, 0.5 ppm and 5 ppm, are the only thresholds for this trap anywhere in the product.
The full entry is `corpus:ph-ammonia-trap`.
```

---

## 5. Hinglish style guide

AquaAI replies in the language the user wrote in. Most Indian hobbyists write Hinglish: Hindi grammar in Latin script, English technical vocabulary, code-switching mid-sentence.

### 5.1 The hard rule

**These never get translated or transliterated, in any language mode:**

| Category | Examples | Stays as |
|---|---|---|
| Species names | Betta, Corydoras, Guppy, Molly, Oscar, Kuhli Loach, Neon Tetra | English / Latin |
| Chemical & parameter names | ammonia, nitrite, nitrate, pH, KH, GH, TDS, chlorine, chloramine, CO2, dissolved oxygen | English |
| Medication & product names | Methylene Blue, Malachite Green, Praziquantel, Metronidazole, Ich-X, Seachem Prime, API Master Test Kit | English (brand as printed) |
| Units & numbers | ppm, mg/L, °C, litre, gallon, %, ml, g | English, Arabic numerals |
| Disease names | Ich, Columnaris, Dropsy, Velvet, Fin Rot | English (a Hinglish alias may appear once in brackets, never alone) |

**Why this is a safety rule, not a style preference.** Hindi has no unambiguous everyday word for ammonia. A model asked to write Hinglish will invent one — "amoniya", "zeher", "gas", "hawa wala cheez". The user then goes to a shop and asks for the wrong thing, or reads a test kit and cannot match the invented word to the bottle in their hand. The same applies to nitrite vs nitrate, which are one letter apart in English and become indistinguishable once transliterated. Every physical object the user must find — a test kit, a bottle, a heater dial — is labelled in English. The answer must use the words printed on those objects.

Grammar, connective tissue, reassurance and explanation are Hinglish. Nouns that name a chemical, a creature, a drug or a measurement are English. That is the whole rule.

### 5.2 Eight worked examples

**1. Reporting a test result**

| | |
|---|---|
| Bad | Aapke tank mein zeher ki maatra bahut zyada hai. |
| Good | Aapke tank mein **ammonia 2 ppm** hai — ye emergency hai, abhi 50% water change kariye. |
| Why | "Zeher" (poison) names nothing testable. The user cannot act on it, cannot verify it, and cannot buy anything to fix it. |

**2. Two similar-sounding parameters**

| | |
|---|---|
| Bad | Naitrait aur naitret dono check karein. |
| Good | **Nitrite** aur **nitrate** dono check kariye — ye alag cheezein hain. Nitrite zyada khatarnak hai, uska target 0 ppm hai. |
| Why | Transliterated, nitrite and nitrate collapse into the same sound. This is the most dangerous possible confusion in the app. |

**3. Naming a medication**

| | |
|---|---|
| Bad | Neeli dawa daal dijiye, wo achhi hoti hai. |
| Good | **Methylene Blue** use kar sakte hain, lekin sirf **hospital tank** mein — ye aapke filter ke bacteria ko maar dega. |
| Why | "Neeli dawa" (blue medicine) matches several unrelated products on an Indian shop shelf, some of which will strip the biofilter. |

**4. Naming the fish**

| | |
|---|---|
| Bad | Aapki chhoti rangeen machhli ko problem hai. |
| Good | Aapke **Betta** ke fins mein rot lag raha hai. |
| Why | Care advice is species-specific. A generic description makes the answer unfilterable — and the app cannot check it against `applies_to`. |

**5. Giving a quantity**

| | |
|---|---|
| Bad | Thoda sa paani badal dijiye. |
| Good | **30% water change** kariye. Aapka tank **60 litre** ka hai, matlab lagbhag **18 litre** paani nikaal ke utna hi naya, dechlorinated paani daaliye. |
| Why | "Thoda sa" is not a dose. Give the percentage, the tank volume, and the litres, so the user does not have to do the arithmetic. |

**6. Attaching a species warning**

| | |
|---|---|
| Bad | Namak daal dijiye, ich ke liye best hai. |
| Good | **Aquarium salt** ek option hai — lekin aapke tank mein **Corydoras** hain, aur inke liye salt risky hota hai. Iske bajaye **Malachite Green** based medication behtar rahega. |
| Why | "Salt is natural, salt is safe" is the most common fatal belief we will encounter. The warning must be attached to the recommendation, in the same sentence, not in a footnote. |

**7. Temperature and equipment**

| | |
|---|---|
| Bad | Paani ka taapmaan tees degree tak badha dijiye. |
| Good | **Temperature** dheere-dheere **30 °C** tak badhaiye — ek din mein zyada se zyada **1–2 °C**. Saath mein **airstone** chalu kar dijiye, kyunki garam paani mein **oxygen** kam ho jaata hai. |
| Why | Spelled-out numbers in Devanagari-derived words are ambiguous and unmatchable to a heater dial. The dial reads 30. Say 30. |

**8. Naming what we could not determine**

| | |
|---|---|
| Bad | Photo dekhkar lagta hai ye fungus hai, anti-fungal daal dijiye. |
| Good | Photo se pakka nahi keh sakte. Ye **Saprolegnia** (true fungus) ho sakta hai ya **Columnaris** (bacterial) — dono dikhne mein similar hain, par treatment alag hai aur **Columnaris mein temperature badhana khatarnak hai**. Pehle **ammonia, nitrite, pH** test kariye aur mujhe batayiye ki patch fuzzy hai ya flat/saddle jaisa. |
| Why | Hedging must survive translation. A confident Hinglish answer from a blurry photo is how a columnaris tank gets heated to death. |

### 5.3 Tone

- **Latin script only, always.** AquaAI never outputs Devanagari, including when the user writes in Devanagari. Devanagari output is not supported in v1 — it is out of scope per `docs/00-product-plan.md` §6 and `specs/T-024`.
- **Match the user's mix.** Heavy-English input gets an English-leaning reply; heavy-Hindi input gets more Hindi connective tissue. Never more Hindi than the user used.
- **Use `aap`, not `tum`.** Polite register by default, regardless of how casually the user writes.
- **Keep sentences short.** Code-switched sentences get hard to parse past about 15 words.
- **No Sanskritised Hindi.** "Jal", "matsya", "aushadhi" are not how anyone types. Use "paani", "fish", "medicine".
- **Common hobby loanwords stay as spoken**: tank, filter, heater, water change, cycle, test kit, planted tank, community tank. Do not translate these into Hindi even though translations exist.
- **Emergencies get the shortest possible first line**, in whichever language the user used, with the number in it: "Ammonia 4 ppm — abhi feeding band kariye aur 50% water change kariye."

### 5.4 Ambiguous language

Decision order:

1. **Devanagari present** → reply in **Hinglish, in Latin script**, with the English/Latin term rule still fully in force. Read the Devanagari, answer in Hinglish. Devanagari output is not supported in v1 (out of scope per `docs/00-product-plan.md` §6 and `specs/T-024`), so it is never produced even when the user's own message is written in it.
2. **Latin script with any Hindi function word** (hai, hain, kya, mera, nahi, kar, karo, kaise, kyun, mein, ko) → Hinglish.
3. **Pure English** → English.
4. **Too short to tell** ("ammonia high?", "ich?", "help") → reply in English, and match whatever the user sends next. English is the safer default because every technical term is already English and no meaning is lost.
5. **Mixed across a conversation** → follow the most recent user message, but never re-translate terms already established earlier in the thread.
6. **Never ask "which language would you prefer?" during an emergency** (`time_to_act: now`). Answer in English, immediately, and let the user redirect.

---

## 6. Hard content rules

Binding on hand-written entries and on generated answers. Enforced by schema validation where possible and by eval suite where not.

### Never

1. **Never give a medication dose without confirmed tank volume and a confirmed inhabitant list.** Ask for both. "Roughly 100 litres" is not confirmed volume; "some tetras and a pleco" is not a confirmed inhabitant list.
2. **Never recommend treatment before testing.** Ammonia, nitrite, pH and temperature come first in nearly every case. If the user has no test kit, that is the recommendation — not a guess at the diagnosis.
3. **Never state a single figure where the hobby genuinely disagrees.** Give the range, and say sources differ and why. Ich temperature therapy and ammonia-binder efficacy are both in this category.
4. **Never claim certainty from a photo.** Photo output is a shortlist of possibilities with a confidence, never a diagnosis. Columnaris/fungus, ich/velvet, and dropsy/normal-gravid all look alike in a phone photo.
5. **Never omit what could not be determined.** Every answer ends with the limits: what we could not see, what we would need to know, what would change the advice.
6. **Never recommend two medications concurrently**, or a medication plus a large temperature change plus salt, without an explicit sourced statement that the combination is safe.
7. **Never recommend antibiotics as a first response.** Water quality first, then a specific diagnosis, then a targeted drug.
8. **Never give a salt recommendation without listing the salt-intolerant inhabitants of that specific tank.**
9. **Never give a copper recommendation to a tank containing invertebrates.** Hard block, not a warning.
10. **Never recommend raising temperature without checking every species' upper limit, current oxygen situation, and whether columnaris is on the differential.**
11. **Never invent a product name, a brand, or an Indian availability claim.** If we do not know whether something is sold in India, say so.
12. **Never present a dose sourced from a veterinary or livestock product** (e.g. cattle dewormers) without the conversion arithmetic shown and a warning about concentration variation.
13. **Never tell a user their fish will be fine.** Say what the odds look like and what changes them.
14. **Never quietly drop a `do_not_do` item to shorten an answer.** Prohibitions are load-bearing; trim the explanation instead.
15. **Never cite a source we did not actually retrieve from.** Citations are checkable and will be checked.
16. **Never answer outside the corpus** on anything safety-critical — symptoms, diagnosis, treatment, doses, parameters, stocking, acclimation, equipment failure. No retrieval hit → say so and offer the human path. This includes plausible-sounding adjacent questions. The one narrow exception is a general, non-safety-critical hobby question ("what does a sponge filter do"), which may be answered from general knowledge if it is clearly marked as not corpus-grounded; the three cases are defined in §1 and anything touching medication, dosing, disease or a specific care parameter is never in that exception.

**Malachite green ruling.** The blanket claim "malachite green harms scaleless fish" is not what our sources support, and the previous wording here ("effective at full strength on scaleless fish, shrimp and snails") confused tolerance with efficacy. The resolved position, to be quoted verbatim wherever malachite green tolerance comes up:

> Malachite green at the label dose of a proprietary aquarium malachite green + formalin product is not categorically unsafe for scaleless fish, shrimp or snails — dose strictly to the specific product's label, never above it and never halved, but do not use it where fish eggs or fry are present, and treat any product whose label excludes scaleless fish or invertebrates as prohibited for that tank.

### Always

- Always give the reason with the prohibition.
- Always name the species-specific exception before the general rule when the user's tank triggers it.
- Always convert to the units on the user's likely test kit (ppm, mg/L, °C, litres).
- Always distinguish "no evidence this works" from "evidence this is harmful".
- Always state the time window: what to do in the next hour vs the next week.

---

## 7. Review workflow

### 7.1 States

`draft` → `sourced` → `peer_reviewed` → `expert_reviewed` → `live` → `stale`

`expert_reviewed` is a Tier 1 state only (see §7.3). Tier 2 and Tier 3 entries go from `peer_reviewed` straight to `live`. A Tier 1 entry may also reach `live` from `peer_reviewed` in its no-dosing form — see the launch unblock in §7.3.

Only `live` entries are indexed for retrieval. `stale` entries (past `review_due`) stay retrievable but are demoted and rendered with an "under review" note.

### 7.2 Writing a topic

1. **Assign** from the list of 62. One writer, one topic.
2. **Source first.** Collect 3+ sources before writing a line, at least one of which is an extension/university/veterinary source. Trusted tier: university extension aquaculture publications (UF/IFAS, Texas A&M, SRAC), Merck Veterinary Manual aquatic sections, Seriously Fish for species data, Practical Fishkeeping and Aquarium Co-Op for hobby practice. Forums are signal about what users believe, never a source for a dose.
3. **Draft to the template.** Every `treatments[]` entry carries its own `dangerous_to` and `source`. Fill `do_not_do` before `immediate_actions` — the prohibitions are usually where the real knowledge is.
4. **Aliases from real data.** Pull from support tickets, search logs and Indian hobbyist groups. Minimum 5, including Hinglish.
5. **Flag conflicts.** Where sources disagree, set `confidence: contested`, present both positions with their sources, and state AquaAI's operating position explicitly in `notes`.

### 7.3 Review — three tiers

Review depth is set by what the entry *asks the user to do*, not by which group it sits in. Requiring a retained aquatic vet for 35 of the 62 entries is not buildable by a solo founder with no budget line for it, and since no AI feature ships until the corpus is reviewed, that requirement blocks the product indefinitely. These tiers are the honest version of the same safety goal.

| Tier | Who reviews | Which entries | Gate |
|---|---|---|---|
| **Tier 1 — expert review** | A named aquatic vet or credentialled aquaculture professional. Paid consult, favour, or a named expert in a hobby community — the requirement is a real named person with real credentials, not a retainer. | Any entry that recommends a **medication, a dose, or a treatment protocol**. That is all 13 of group E (`aquarium-salt` … `dose-calculation`, which includes `heat-treatment`) plus `prophylactic-quarantine-treatment` — **14 entries outright, roughly a quarter of the 62** — and, separately, the `treatments[]` block of any group C or D disease entry that carries a dose (~15 more entries where only that block is Tier 1 gated). | The AI may not cite the entry's dosing content until this is signed off. |
| **Tier 2 — experienced-hobbyist review** | A named person from the community with real keeping experience. Credentials not required; a name and an accountable track record are. | Disease **identification** and prognosis (groups C and D, minus their dosing blocks), water chemistry (group A), the nitrogen cycle (group B), environmental risk (group F), equipment failure (group G). | Entry may go `live` on Tier 2 sign-off. |
| **Tier 3 — founder self-review, sources cited** | The founder, working to §7.2. Every claim carries a source URL; the sourcing discipline is what substitutes for a second pair of eyes. | Everything else: water changes and acclimation (group H), quarantine setup and vectors (`quarantine-setup`, `disease-vectors-equipment`), and any entry that recommends no treatment and states no dose. | Entry may go `live` on Tier 3 sign-off. |

Two gates still apply to every tier:

| Gate | Who | Checks |
|---|---|---|
| Peer review | A second reader — content writer, or the Tier 2/3 reviewer above acting in this role | Schema valid; every dose has a source URL; `dangerous_to` non-empty on every treatment; `do_not_do` has reasons attached; no single figure on a contested point. |
| India review | India-based reviewer | Product availability, tap water realities, power-cut assumptions, Hinglish aliases, price sanity. |
| Sign-off | Content lead | Sets `last_reviewed_by` (a person's name) and `last_reviewed_on`. |

**An entry cannot go `live` without a real name in `last_reviewed_by`. This is enforced in the build, not by convention, and it is unchanged.** What the tiers change is *whose* name is acceptable, not whether a name is required. The build additionally records which tier an entry was reviewed at, and a Tier 1 entry with dosing content and no Tier 1 reviewer name is a build failure.

**The launch unblock.** A Tier 1 entry may ship before an expert has seen it, as **identification and when-to-escalate only, with no dosing content** — no `treatments[]` block in the retrieval payload, no dose, no protocol, and the answer states plainly that the treatment detail is not available yet and points to the human path. This is honest, it is safe, and it means the absence of a vet delays the dosing half of ~30 entries rather than the whole product. The dosing content is written and held in the file, marked as not yet expert-reviewed, and switched on the day it is signed off.

### 7.4 Re-review cadence

| Class | Cadence |
|---|---|
| `severity: critical` or any medication entry | Every 6 months |
| `confidence: contested` | Every 6 months |
| Disease entries | Every 12 months |
| Everything else | Every 18 months |
| Any entry | Immediately, on a triggering event (see 7.5) |

A weekly build job lists entries within 30 days of `review_due` and files them to the content lead.

### 7.5 Triggering events (force immediate re-review)

- Two or more "this was wrong" reports on the same entry within 30 days
- Any report of a fish death attributed to advice from an entry — **highest priority, always reviewed within 48 hours**
- A cited source URL 404s, or its content materially changes
- A product named in `treatments[]` is reformulated, renamed or withdrawn
- New published research or a regulatory change on a listed drug
- A retrieval-quality report showing the entry is being returned for the wrong questions

### 7.6 "This answer was wrong" loop

Every AI answer carries a report control. Reports carry the answer text, the retrieved entry ids, the user's tank profile, and the user's description of what happened.

1. **Triage within 24 h** (4 h for any report mentioning a death). Classify:
   - **Retrieval miss** — right corpus content existed, wrong entry returned → fix aliases/`applies_to`, add a retrieval eval case.
   - **Corpus gap** — no entry covered it → file a new topic, add to the backlog with a severity estimate. This is the primary growth mechanism for the corpus beyond the initial 62.
   - **Corpus error** — the entry itself is wrong → immediate re-review at that entry's tier (Tier 1 if it states a dose or a treatment protocol); entry goes `stale` and is demoted until fixed.
   - **Generation error** — corpus was right, answer misrepresented it → add to the eval suite as a regression case; this is a prompt/model issue, not a content issue.
   - **Not an error** — user disagrees with correct advice → log it. Repeated instances mean the explanation is failing, which is a content problem too.
2. **Close the loop with the user.** Tell them what changed. This is the cheapest trust-building action available and it is also how we get the follow-up detail.
3. **Every corpus error produces an eval case** so the same failure is caught automatically next time.
4. **Monthly review** of report clusters. Clusters are the ranked backlog for topics 63 onward.

### 7.7 Metrics worth watching

| Metric | Why |
|---|---|
| % of answers with at least one citation | Should be 100%; anything less means ungrounded answers are shipping. |
| % of answers that hit the "no grounded content" path | Rising = corpus gaps. Falling to zero = retrieval threshold set too loose. |
| "Wrong answer" reports per 1,000 answers, by entry | Identifies the specific entries that need work. |
| Entries past `review_due` | Freshness debt. |
| Entries with a real name in `last_reviewed_by` | Must be 100% of `live`. |
| Time-to-triage on death-related reports | The one SLA that cannot slip. |

---

## Sources used in this document

- Texas A&M / UF IFAS Extension — [*Ichthyophthirius multifiliis* (White Spot) Infections in Fish, CIR920/FA006](https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ichthyophthirius-multifiliis-White-Spot-Infections-in-Fish.pdf)
- Texas A&M / UF IFAS Extension — [Ammonia in Aquatic Systems, FA16/FA031](https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf)
- UF IFAS Extension — [The Use of Salt in Aquaculture, VM86/VM007](https://ask.ifas.ufl.edu/publication/VM007/pdf)
- Merck Veterinary Manual — [Environmental Diseases of Aquatic Animals in Aquatic Systems](https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems)
- Practical Fishkeeping — [How to solve a problem like whitespot](https://www.practicalfishkeeping.co.uk/features/how-to-solve-a-problem-like-whitespot/)
- Aquarium Co-Op — [How to Treat Ich](https://www.aquariumcoop.com/blogs/aquarium/ich-treatment)
- Aquarium Science — [10.2.2 Ich](https://aquariumscience.org/index.php/10-2-2-ich/)
- Aquarium Science — [5.5.3.2.1 Prime, Safe and Ammonia](https://aquariumscience.org/index.php/5-5-3-2-1-prime-safe-and-ammonia/)
