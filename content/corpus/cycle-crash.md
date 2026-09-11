---
id: cycle-crash
title: Cycle Crash
status: sourced
review_tier: 2
aliases:
  - cycle crashed
  - established tank ammonia suddenly
  - cleaned filter fish dying
  - power cut fish tank ammonia
  - biofilter died
  - mini cycle
severity: high
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Sudden ammonia and/or nitrite readings in a tank that has been established and stable for a long time, with no new fish added
  - Fish showing the same distress signs as a new-tank ammonia spike (gasping, red gills, lethargy) but in a mature tank
likely_causes:
  - Filter media rinsed under a chlorinated tap instead of in removed tank water, killing the bacterial colony
  - Filter media or cartridges fully replaced at once rather than staggered
  - Extended power cut stopping the filter for many hours — the bacteria are aerobic and the media can go anoxic, killing much of the colony
  - A course of antibiotic or other medication dosed into the display tank, which does not distinguish between pathogenic bacteria and the beneficial nitrifying bacteria
  - Filter left off for an extended period during travel, tank moving, or maintenance
immediate_actions:
  - Treat this exactly as an acute ammonia/nitrite spike (see corpus:ammonia-spike and corpus:nitrite-spike) — test everything, check pH before choosing water-change size, and follow the same emergency protocol.
  - Identify which of the likely causes applies, so the same mistake is not repeated once the biofilter recovers.
  - If available, seed the recovering filter with media from another established, healthy tank to speed recovery.
  - Resume the same daily-testing routine used for a fresh cycle until ammonia and nitrite both hold at 0 for a full week.
do_not_do:
  - Do not rinse filter media or sponges under a chlorinated tap — always rinse gently in water removed from the tank itself.
  - Do not replace all filter media at once — stagger replacement (e.g. rinse or replace one component at a time, weeks apart) specifically to avoid crashing the whole colony together.
  - Do not restart a filter that has been off for many hours without first checking/rinsing the media gently — anoxic media can release a slug of trapped toxins when water flow resumes.
  - Do not dose antibiotics or other biofilter-damaging medication into a display tank if it can be avoided — treat sick fish in a separate hospital/quarantine tank instead (see corpus:quarantine-setup).
when_to_escalate: "Repeated crashes despite correcting the identified cause — treat any severe readings the same as the acute ammonia/nitrite entries' own escalation thresholds, since a crashed mature tank can reach the same danger levels as a fresh uncycled one."
treatments:
  - name: Seeded media from another established tank
    dose: A sponge, ceramic media, or mature substrate from a healthy tank
    duration: Single addition, speeds recovery significantly
    dangerous_to: [disease_transfer_risk_if_source_tank_unhealthy]
    notes: Same principle as recovering from any cycle disruption — transplant an existing colony rather than waiting for one to regrow from nothing.
    source: https://www.aquariumcoop.com/blogs/aquarium/how-to-cycle-a-fish-tank
sources:
  - https://www.aquariumcoop.com/blogs/aquarium/how-to-cycle-a-fish-tank
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

A cycle crash is what happens when an established, mature biofilter is damaged or killed outright, and the
tank effectively re-experiences a mini version of the original cycling process — ammonia and nitrite can
spike in a tank that had been stable for months or years, catching keepers off guard because "the tank is
already cycled" is treated as a permanent, set-once fact rather than an ongoing biological population that
can be damaged.

The most common real-world causes are all maintenance mistakes: rinsing filter media under a chlorinated
tap instead of in removed tank water, replacing all filter media at once instead of staggering it, a
medication course (especially antibiotics) that does not distinguish beneficial nitrifying bacteria from
the pathogen it was meant to treat, and extended power cuts — common in much of India — that stop filter
flow long enough for the media to go anoxic and the aerobic bacterial colony to die back.

Once a crash happens, treat it exactly like an acute ammonia or nitrite spike (corpus:ammonia-spike,
corpus:nitrite-spike) and resume daily testing until the biofilter has genuinely recovered. Seeding with
media from another healthy, established tank is the fastest way back, for the same reason it speeds up any
cycle.
