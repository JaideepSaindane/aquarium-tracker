---
id: chlorine-chloramine-poisoning
title: Chlorine and Chloramine Poisoning
status: sourced
review_tier: 1
aliases:
  - chlorine poisoning fish
  - chloramine fish
  - tap water fish died
  - fish gasping after water change
  - forgot dechlorinator
  - municipal water fish tank
  - fish died right after water change
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all, invert]
symptoms:
  - Fish gasping, thrashing or showing acute distress within minutes to a couple of hours of a water change
  - Red, inflamed or bleeding gills
  - Excess mucus production, fish rubbing against surfaces
  - Sudden deaths clustered right after a water change, especially one where dechlorinator was skipped, measured wrong, or used at too low a dose for chloramine specifically
  - A faint pool/swimming-pool smell to freshly drawn tap water
likely_causes:
  - Dechlorinator forgotten entirely before adding tap water
  - Dechlorinator dosed for chlorine only, when the actual supply uses chloramine (a more stable, longer-lasting combination of chlorine and ammonia) — a plain chlorine-neutraliser does not fully break this down
  - Dechlorinator underdosed relative to the true tank volume (see corpus:dose-calculation)
  - Using water from a source with unusually high chlorine/chloramine dosing (e.g. after a municipal supply issue or a burst-pipe/contamination event prompting extra treatment)
immediate_actions:
  - Dose a dechlorinator immediately at label rate for the full tank volume — even after the fact, this helps neutralise remaining chlorine/chloramine faster than it would break down on its own.
  - Increase aeration heavily — chlorine and chloramine both damage gill tissue and impair oxygen uptake; extra surface agitation helps compensate while the gills recover.
  - Do a partial water change with properly dechlorinated water only if you suspect an ongoing source of contamination (e.g. dechlorinator itself failed) — otherwise avoid another change immediately, since the fish are already stressed.
  - Watch closely for the next several hours; gill damage from chlorine exposure can continue to show effects after the chlorine itself is neutralised.
  - Confirm which dechlorinator product is in use and check its label specifically states it neutralises chloramine, not just chlorine — many older or basic products handle chlorine only.
do_not_do:
  - Do not assume any dechlorinator handles chloramine — check the label. A chlorine-only product will neutralise the chlorine component and release free ammonia from the chloramine, effectively trading one poisoning risk for another.
  - Do not "let tap water sit out" as a substitute for dechlorinator if the supply uses chloramine — chloramine is far more stable than chlorine and does not meaningfully off-gas by sitting, unlike plain chlorine which does over 24-48h with aeration.
  - Do not underdose dechlorinator based on the tank's nominal/box size rather than its true water volume after substrate and decor (see corpus:dose-calculation) — this is one of the most common real-world causes of a "why did dechlorinator not work" report.
when_to_escalate:
  - Repeated poisoning events despite correct dechlorinator use — check whether the water authority has changed treatment methods (chlorine to chloramine, or vice versa) or increased dosing, which can catch keepers using an outdated routine off guard.
  - Severe, tank-wide distress — this is a "test then aerate then wait" situation, not one with a further chemical fix beyond dechlorination; supportive care and time are what matters most once the water itself is corrected.
treatments:
  - name: Broad-spectrum water conditioner/dechlorinator rated for chloramine
    dose: Label rate for the full, true tank volume — check the product specifically states chloramine neutralisation, not chlorine only
    duration: Immediate, single dose per water change
    dangerous_to: [none_known_at_correct_dose]
    notes: The only reliable fix. Confirm the product's label claims match the actual water treatment method used by the local supply.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - name: Increased aeration/surface agitation
    dose: Maximise surface movement and/or add an airstone temporarily
    duration: Several hours while gills recover
    dangerous_to: [none_known]
    notes: Supportive only — does not neutralise the chemical itself, but helps fish cope with gill damage while it clears.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Most municipal water supplies are treated with either free chlorine or chloramine (a combination of
chlorine and ammonia, favoured by many utilities because it is more stable in distribution pipes and lasts
longer). Both are toxic to fish at the concentrations used for human drinking-water safety — they damage
gill tissue directly, and poisoning can show within minutes of exposure during a water change.

The critical distinction most keepers miss is that these two treatment types need different handling.
Plain chlorine will off-gas from standing water over a day or two with agitation, and any basic
dechlorinator neutralises it. Chloramine does neither — it does not meaningfully evaporate by sitting out,
and a chlorine-only neutraliser will strip the chlorine component while leaving free ammonia behind,
which is its own poisoning risk. A dechlorinator that explicitly handles chloramine (most modern
multi-purpose conditioners do, but not all) is the only reliable fix, and it needs to be dosed for the
tank's true water volume, not its nominal size.

Because the local water authority can change treatment methods without public notice, a routine that
worked for years can suddenly stop being adequate — repeated unexplained poisoning after water changes is
worth checking against a current dechlorinator label and the current local water treatment method, not
just re-dosing the same way.
