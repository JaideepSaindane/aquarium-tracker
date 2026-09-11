---
id: nitrite-spike
title: Nitrite Spike
status: sourced
review_tier: 1
aliases:
  - nitrite spike
  - nitrite high
  - brown blood disease
  - methemoglobinemia
  - fish gasping normal oxygen
  - nitrite 1 ppm
  - second stage cycle ammonia gone
  - gills brown
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Gasping at the surface even though ammonia tests at 0
  - Gills that look brown or grey-brown instead of red (methaemoglobinaemia — "brown blood disease")
  - Rapid, laboured breathing at rest
  - Lethargy, loss of appetite, fish hanging near the surface or filter outflow
  - Sudden deaths in a tank that is 2-4 weeks into cycling, right after ammonia has started to fall
likely_causes:
  - Mid-cycle — ammonia-oxidising bacteria have established but nitrite-oxidising bacteria have not caught up yet (the normal, expected second hump of a fishless or fish-in cycle)
  - Overstocking or overfeeding pushing more nitrogen through the tank than the biofilter's nitrite-oxidisers can handle
  - A cycle disruption that killed the nitrite-oxidising bacteria specifically (these are slower to recover than ammonia-oxidisers)
  - High-nitrite well or borewell water in some regions, entering with water changes
immediate_actions:
  - Test ammonia, nitrite, nitrate and pH together. Nitrite toxicity is the one exception to "always test everything" that gets a genuine shortcut — chloride directly blocks nitrite uptake at the gill, so the fix differs by water hardness even before you know the exact ppm.
  - Add aquarium salt (plain non-iodised NaCl) or a chloride source at 1 gram per litre (roughly 1 teaspoon per 5 US gallons) for freshwater, scaleless-safe species. This is the single most effective emergency step — chloride ions outcompete nitrite for the same gill uptake pathway and it works within hours. Skip this step entirely for scaleless fish, and use extreme caution with any shrimp or snail in the tank (see do_not_do).
  - Do a 30-50% water change with dechlorinated, temperature-matched water to dilute the nitrite directly.
  - Increase surface agitation/aeration — nitrite-damaged blood carries oxygen poorly, so raising dissolved oxygen partially compensates even though it does not fix the underlying nitrite.
  - Stop feeding for 24-48 hours to reduce the nitrogen load going through the biofilter.
  - Re-test nitrite in 12-24 hours; repeat the water change and salt dose (staying within the total salt target, do not keep re-dosing on top of what is already in) until nitrite reads 0.
do_not_do:
  - Do not add salt to a tank with scaleless fish (most catfish, loaches) without researching that specific species' salt tolerance first — many tolerate it poorly at even this dose.
  - Do not add salt to a tank with shrimp, snails or other freshwater invertebrates — 1g/L can be harmful or fatal to sensitive shrimp species (e.g. Caridina). Use only the water-change/aeration steps for invertebrate tanks and escalate sooner.
  - Do not interpret 0 ammonia as "the tank is fine" mid-cycle — nitrite is the far more dangerous stage for most livestock and it is easy to miss because water often still looks clear.
  - Do not do a 100% water change to "reset" nitrite — this strips beneficial bacteria along with the nitrite and restarts the cycle from further back.
  - Do not add more fish while nitrite reads above 0, even if it looks like it is trending down.
when_to_escalate:
  - Nitrite above roughly 5 ppm with fish showing brown gills and heavy gasping — this is a severe case; alongside salt and water changes, moving vulnerable fish to already-cycled water is worth considering the same way it is for a severe ammonia spike.
  - Nitrite will not drop after repeated water changes and correct salt dosing — check for a nitrite-contaminated water source (some borewell/well water) before assuming the biofilter is simply slow.
  - Any scaleless or invertebrate stock in a tank experiencing a nitrite spike — these need individual research on safe intervention rather than the default salt protocol above.
treatments:
  - name: Non-iodised aquarium/cooking salt (sodium chloride)
    dose: "1 gram per litre (~1 tsp per 5 US gallons) of tank water, dosed once and maintained at that level via top-offs, not redosed per water change"
    duration: Until nitrite reads 0, then can be left to dilute out gradually via normal water changes
    dangerous_to: [scaleless_species_variable_tolerance, shrimp, most_snails, live_plants_at_higher_doses]
    notes: Chloride ions competitively block nitrite uptake at the gill — this is a genuine, well-supported emergency intervention, not a folk remedy, but it is species-specific in tolerance. Research the exact species in the tank before dosing plain community-tank salt levels.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - name: Water changes to dilute nitrite
    dose: 30-50%, temperature-matched and dechlorinated
    duration: Repeat every 12-24h until nitrite reads 0
    dangerous_to: [none_known]
    notes: Slower than salt alone but works for every species including scaleless fish and invertebrates.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Nitrite is the middle stage of the nitrogen cycle: ammonia-oxidising bacteria convert ammonia to nitrite,
and a second, slower-growing group of bacteria converts nitrite to the far less toxic nitrate. Because the
second group establishes later than the first, almost every new tank goes through a genuine nitrite spike
even when everything else is done correctly — this is expected, not a sign of failure, but it is dangerous
and needs active management, not just patience.

Nitrite crosses the gill membrane and binds haemoglobin, forming methaemoglobin, which cannot carry
oxygen. The fish suffocates in water that has plenty of dissolved oxygen — this is why gasping at the
surface with a 0 ammonia reading confuses so many first-time keepers, and why the gills themselves often
look brown rather than red on a badly affected fish.

The emergency fix is chloride, not more oxygen. Chloride ions compete with nitrite for the same transport
mechanism at the gill, so raising chloride (via plain non-iodised salt, for salt-tolerant species) reduces
nitrite uptake directly and works faster than waiting for the biofilter to catch up. This is the one place
in this corpus where a "salt fixes everything" instinct is actually correct — but only for salt-tolerant
freshwater fish. Scaleless fish and invertebrates need water changes and time instead, since their
tolerance for the dose that works on nitrite is inconsistent to poor.
