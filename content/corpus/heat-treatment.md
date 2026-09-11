---
id: heat-treatment
title: Heat Treatment as Therapy
status: sourced
review_tier: 1
aliases:
  - raise temperature treat ich
  - heat treatment fish disease
  - warm water cure fish
  - increase heater fish sick
  - does heat kill ich
severity: medium
time_to_act: routine
applies_to:
  water_type: [freshwater]
  species_traits: [cool_water]
symptoms: []
likely_causes: []
immediate_actions:
  - Confirm the specific diagnosis before raising temperature as a treatment — this technique genuinely helps for ich (speeds the parasite's vulnerable free-swimming stage) but actively worsens columnaris and increases oxygen demand generally, so using it on the wrong diagnosis can make things worse, not better.
  - Raise temperature gradually (roughly 1°C per hour, not all at once) to the target range for the specific protocol being followed, and never above what the actual species in the tank can safely tolerate.
  - Increase aeration alongside any temperature increase — warmer water holds less dissolved oxygen, and disease treatment already stresses a fish's oxygen needs.
  - Never use heat treatment on cool-water species (e.g. goldfish, White Clouds) for whom the elevated target temperature is itself harmful.
do_not_do:
  - Do not raise temperature as a treatment for columnaris — this is the most consequential mistake possible with this technique, since columnaris progresses faster at higher temperatures, the opposite of what heat-as-therapy does for ich (see corpus:columnaris).
  - Do not raise temperature rapidly — a fast jump is itself a stressor on top of whatever is being treated (see corpus:temperature-swings).
  - Do not use elevated-temperature protocols on cool-water species regardless of the diagnosis — the temperature itself becomes the harm.
  - Do not treat heat as a universally safe, side-effect-free technique — it raises oxygen demand and metabolic rate for every fish in the tank, not just the target parasite.
when_to_escalate: ""
treatments:
  - name: Gradual temperature increase (ich protocols specifically)
    dose: Raised gradually, roughly 1°C per hour, to a target appropriate for the species and the specific ich protocol being followed (commonly in the upper 20s-low 30s °C range, verified against the specific species' safe tolerance)
    duration: Sustained for the duration of the ich treatment protocol
    dangerous_to: [cool_water_species, columnaris_cases, oxygen_demand_increases_for_all_species]
    notes: Genuinely effective for shortening ich's vulnerable free-swimming stage, but sources within the hobby do disagree on exact optimal protocols and this should not be used without confirming the diagnosis is actually ich and not columnaris, which this makes worse.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/parasitic-diseases-of-fish
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/parasitic-diseases-of-fish
confidence: contested
last_reviewed_by: ""
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Raising tank temperature is a real, supported part of some disease treatment protocols — most notably for
ich, where warmer water speeds the parasite through its vulnerable free-swimming stage, shortening the
window during which treatment can actually kill it. This corpus is explicit that the hobby and available
sources genuinely disagree on the precise optimal protocols for this technique, which is why it is marked
contested rather than settled.

What is not contested, and matters more for safety, is that this same technique is actively harmful when
misapplied to the wrong diagnosis. Columnaris — a fast-killing bacterial infection sometimes confused with
other conditions — progresses faster at higher temperatures, meaning the "raise the heat to help treat
disease" instinct that is correct for ich becomes actively dangerous if the actual problem is columnaris
(see corpus:columnaris). Confirming the diagnosis before reaching for this technique is not a formality; it
determines whether the intervention helps or actively accelerates the disease.

Heat treatment also carries a universal cost regardless of diagnosis: warmer water holds less dissolved
oxygen while raising every fish's metabolic and oxygen demand, so it should always be paired with increased
aeration and should never be applied to cool-water species for whom the target temperature is itself
harmful, independent of whatever disease is being treated.
