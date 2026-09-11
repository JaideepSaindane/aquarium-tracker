---
id: stalled-cycle
title: Stalled Cycle
status: live
review_tier: 2
aliases:
  - cycle stalled
  - ammonia not going down
  - nitrite stuck
  - cycle not progressing
  - bacteria not growing
  - cycle taking too long
severity: medium
time_to_act: 72h
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Ammonia (or nitrite) readings that have stopped falling for a week or more, well past the typical timeframe
  - No visible progress in the expected ammonia-then-nitrite-then-nitrate pattern despite consistent dosing
likely_causes:
  - pH below roughly 6.5 — nitrifying bacteria slow dramatically or stop functioning well below this
  - Chlorine or chloramine present because a water change was done without dechlorinator, killing the developing bacterial colony
  - Any medication (especially antibiotics) dosed into the tank during cycling, which can kill nitrifying bacteria as collateral damage
  - No consistent ammonia source — gaps in dosing, or a source that ran out, giving the bacteria nothing to feed on and grow
  - Low temperature slowing bacterial growth rate generally
  - Insufficient time — a stall of a few days within an otherwise normal-length cycle is often just normal variation, not a genuine stall
immediate_actions:
  - Test and record pH — if it has fallen below roughly 6.5, this alone can stall a cycle almost completely; nitrifying bacteria need a higher pH to function well.
  - Confirm no chlorinated/chloramine water has been added without dechlorinator recently.
  - Confirm no medication has been dosed into the cycling tank.
  - Confirm ammonia is actually present and being redosed consistently — a stall can simply mean the bacteria have nothing to consume.
  - If pH is the identified cause, raise it gradually (see corpus:ph-crash-kh-exhaustion for the "gradual, not sudden" principle) rather than in one large correction.
  - If none of the above explain it, be patient for a further 1-2 weeks before concluding something is actually wrong — cycle length genuinely varies.
do_not_do:
  - Do not add more ammonia on top of an already-high reading, assuming "more feeding" will fix a stall — if bacteria are not processing what is already there, adding more just makes the eventual correction harder.
  - Do not dose bottled bacteria products as an automatic fix without first checking for pH, chlorine or medication causes — see corpus:bottled-bacteria-claims for how inconsistent these products are.
  - Do not give up and do a full tank reset (draining and restarting) — this discards whatever bacterial progress has already been made.
when_to_escalate: "A stall lasting several weeks with none of the common causes (pH, chlorine, medication, missing ammonia source) identified — worth a second, experienced pair of eyes on the full parameter history rather than continuing to guess."
treatments:
  - name: Gradual pH correction if pH is below ~6.5
    dose: Small, staged buffer additions, re-testing between each (see corpus:ph-crash-kh-exhaustion)
    duration: Over several days
    dangerous_to: [rapid_swings_if_overdosed]
    notes: One of the most common genuine stall causes and often overlooked in favour of assuming "the bacteria just need more time".
    source: https://www.aquariumcoop.com/blogs/aquarium/how-to-cycle-a-fish-tank
sources:
  - https://www.aquariumcoop.com/blogs/aquarium/how-to-cycle-a-fish-tank
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
confidence: medium
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

A cycle that appears stalled — ammonia or nitrite readings that stop falling for a week or more — almost
always has one of a small set of identifiable causes, rather than being a mystery requiring more waiting.
The most commonly missed one is pH: nitrifying bacteria slow down substantially and can nearly stop
functioning below roughly pH 6.5, so a cycle in naturally soft, acidic water can look permanently stuck
even though nothing else is wrong.

Other common causes are more direct: chlorinated or chloraminated water added without dechlorinator kills
the developing bacterial colony outright; any medication, especially antibiotics, does the same; and a
missing or inconsistent ammonia source simply gives the bacteria nothing to grow on.

Diagnosing a stall means checking these specific, ordinary causes in order rather than assuming the
process itself has failed or reaching for a bottled bacteria product as an automatic fix — see
corpus:bottled-bacteria-claims for why those products are inconsistent and not a substitute for identifying
the actual cause.
