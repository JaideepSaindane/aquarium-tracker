---
id: oxygen-depletion
title: Oxygen Depletion
status: live
review_tier: 2
aliases:
  - fish gasping at surface
  - low oxygen fish tank
  - all fish at top gasping
  - fish tank oxygen crash
  - fish dying overnight no reason
  - suffocating fish
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Fish gathered at the surface, gasping, often all or most fish in the tank at once
  - Rapid, laboured breathing across multiple fish simultaneously
  - Sudden, unexplained deaths, sometimes overnight — dissolved oxygen is naturally lowest in the early morning hours after a night without photosynthesis in planted tanks
likely_causes:
  - Elevated temperature (see corpus:heatwave-overheating) — warmer water holds less oxygen while raising fish's demand for it
  - Overstocking relative to the tank's surface agitation/filtration capacity
  - A stopped or malfunctioning filter/air pump, including during a power cut (see corpus:power-cuts)
  - Heavy medication load, especially formalin or multiple stacked medications (see corpus:formalin, corpus:medication-stacking)
  - A planted tank at night — plants consume oxygen and produce CO2 in the dark (the reverse of daytime photosynthesis), so oxygen is naturally lowest just before dawn, and a heavily planted tank with high daytime CO2 injection can compound this
  - Overfeeding leading to decomposing waste that consumes oxygen as it breaks down
immediate_actions:
  - Increase surface agitation and aeration immediately — this is the single fastest fix for oxygen depletion regardless of the underlying cause, and should be the first response even before diagnosing why oxygen dropped.
  - Check and restore filter/air pump function if that is the cause.
  - If in a heatwave, address temperature in parallel (see corpus:heatwave-overheating) since heat and oxygen depletion compound each other.
  - Reduce feeding temporarily to cut down on decomposing waste load.
  - If CO2 injection is in use in a planted tank, confirm it is not running excessively or continuing overnight when plants are not photosynthesizing to offset it.
do_not_do:
  - Do not delay adding aeration while trying to first diagnose the exact cause — oxygen depletion can kill within a short window, and increasing surface agitation is safe and helpful regardless of the underlying reason.
  - Do not run CO2 injection on a planted tank without a nighttime shutoff (timer) — CO2 continuing overnight while plants are not photosynthesizing compounds naturally low overnight oxygen levels.
  - Do not assume a single fish gasping alone means oxygen depletion — that pattern more often points to an individual health issue (see corpus:gill-flukes for one example); it is tank-wide, simultaneous gasping that points to genuine oxygen depletion.
when_to_escalate: "Repeated overnight gasping or deaths in a planted, CO2-injected tank despite a nighttime CO2 shutoff — this needs a fuller review of stocking density, surface agitation, and CO2/light timing balance, ideally with an experienced planted-tank keeper's input."
treatments:
  - name: Increased surface agitation / aeration
    dose: Add or increase an airstone, increase filter outflow surface disturbance, or add a second air pump
    duration: Immediate and ongoing until the underlying cause is resolved
    dangerous_to: [none_known]
    notes: The fastest, safest, most universally applicable first response to suspected oxygen depletion of any cause.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
confidence: high
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Oxygen depletion kills faster than almost anything else in this corpus, and its defining symptom pattern —
multiple or all fish gathered at the surface, gasping simultaneously — is usually distinguishable from an
individual fish's health problem by that very simultaneity. A single fish gasping alone more often points
to something specific to that fish (a gill parasite, an internal issue); the whole tank gasping at once
points to the water itself running short of oxygen.

Several causes compound with each other rather than acting independently: heat reduces how much oxygen
water can hold while raising fish's oxygen demand at the same time (see corpus:heatwave-overheating);
overstocking increases total demand against a fixed supply; a stopped filter or air pump removes the main
source of surface agitation that drives oxygen exchange; and in planted tanks, oxygen is naturally lowest
in the hours before dawn, since plants consume oxygen overnight in the absence of photosynthesis — a
pattern that gets worse if CO2 injection continues running without a nighttime shutoff.

Because the immediate fix — increasing surface agitation and aeration — is safe, fast, and helps regardless
of which specific cause is at play, it should be the first response the moment oxygen depletion is
suspected, with diagnosing the underlying cause happening in parallel rather than first.
