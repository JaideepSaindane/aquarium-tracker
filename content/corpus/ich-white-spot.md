---
id: ich-white-spot
title: Ich / White Spot Disease (Ichthyophthirius multifiliis)
status: sourced
review_tier: 1
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
    notes: Widely used by public aquaria. On scaleless fish, shrimp and snails the claim to carry is about TOLERANCE, not efficacy — see the malachite green ruling in docs/05-content-guide.md §6. Verify the specific product before dosing, since formalin content varies between brands. Reduces dissolved oxygen; aerate. Formalin is a human respiratory and carcinogenic hazard — dose in a ventilated room, never in a closed bathroom.
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
    notes: "CONTESTED. Practical Fishkeeping and standard hobby practice recommend raising to ~30 °C to accelerate the life cycle so the vulnerable free-swimming stage is exposed to medication sooner. Extension guidance describes a cycling 32 °C/21 °C protocol for pet fish. Other reviewers state that controlled studies show heat alone is ineffective. AquaAI position: heat is an ADJUNCT that shortens the treatment window, never a standalone cure, and is contraindicated for cool-water species and gill-compromised fish."
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
