---
id: filter-failure
title: Filter Failure
status: sourced
review_tier: 2
aliases:
  - filter stopped working
  - filter not pumping water
  - filter making noise not working
  - aquarium filter broken
  - filter died fish tank
  - no flow from filter
severity: high
time_to_act: 24h
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - No visible water flow/return from the filter outlet
  - Unusual noise (grinding, rattling) or the motor running but producing little or no flow
  - Water clouding, or ammonia/nitrite readings rising within a day or two of the filter stopping
likely_causes:
  - A clogged intake, impeller, or media blocking flow despite the motor still running
  - A failed motor, worn impeller, or a stuck/broken impeller shaft
  - Media left too long without rinsing, effectively suffocating the biofilter and restricting flow at the same time
  - A power interruption (see corpus:power-cuts) stopping the filter along with everything else
immediate_actions:
  - Check the obvious first: power connection, intake blockage, and whether the impeller spins freely when the housing is opened.
  - If the impeller or media is simply clogged, clean it in removed tank water (not tap water, which can kill the beneficial bacteria) and restart.
  - If the filter has genuinely failed mechanically, get a replacement or backup filtration running as soon as practical — even a basic air-powered sponge filter temporarily is far better than no biological filtration at all.
  - Monitor ammonia and nitrite daily until filtration is fully restored and stable, since a stopped filter risks the same biofilter die-back and delayed spike covered in corpus:cycle-crash.
  - Preserve as much of the existing filter media as possible when replacing hardware — moving established media into a new filter housing keeps most of the biological colony intact rather than starting the cycle over.
do_not_do:
  - Do not rinse filter media or an impeller under tap water — chlorine/chloramine in tap water kills the beneficial bacteria the media is trying to preserve; use removed tank water instead.
  - Do not leave a tank with no filtration for an extended period assuming "it'll be fine for a day or two" — treat it with the same urgency as a stalled or crashed cycle.
  - Do not discard old filter media when replacing a failed filter unit if the media itself is still viable — transferring it into the new unit preserves the biological colony.
when_to_escalate: "Filtration down for more than about 24 hours combined with rising ammonia or nitrite, or fish showing distress — treat as the acute ammonia/nitrite protocols (corpus:ammonia-spike, corpus:nitrite-spike) apply, not just an equipment fix."
treatments: []
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Filter failure matters beyond the immediate loss of water flow because the filter is usually also the
tank's biological filtration — the home for the nitrifying bacteria that keep ammonia and nitrite at safe
levels. A stopped filter is therefore both a mechanical problem and, if it stays stopped for long enough, a
biofilter problem with the same delayed-spike risk described in corpus:cycle-crash.

The most common real fix is simpler than a full replacement: a clogged intake, impeller, or media bed
restricting flow while the motor itself is still fine. Cleaning with removed tank water, never tap water,
matters here specifically to avoid killing the bacterial colony the cleaning is meant to preserve — tap
water's chlorine or chloramine does exactly what it is designed to do to any bacteria it touches.

When a filter has genuinely failed mechanically, preserving the existing media and moving it into
replacement hardware (rather than starting with fresh media) keeps most of the established biological colony
intact, meaningfully shortening the recovery period compared to running a fresh, uncolonised filter from
scratch.
