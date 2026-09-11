---
id: ph-crash-kh-exhaustion
title: pH Crash / KH Exhaustion
status: live
review_tier: 2
aliases:
  - ph crash
  - kh exhaustion
  - ph dropped overnight
  - ph 5 fish tank
  - all fish dead overnight ph
  - acidic tank sudden
  - kh zero
  - buffer ran out
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [soft_water, invert]
symptoms:
  - Fish found dead or dying with no other warning signs, often overnight or over a day or two
  - pH test reads unusually low (below 6.0, sometimes below 5.0) when it was previously stable in the 7s
  - KH (carbonate hardness) tests at or near 0
  - Fish gasping, erratic swimming, or lying on the bottom shortly before a crash if caught early
  - Sudden fish deaths clustered together in time rather than spread out
likely_causes:
  - KH (carbonate hardness) has been slowly consumed by the nitrogen cycle's own acid production and never replaced, until it hits zero and can no longer buffer pH at all
  - Soft or RO/DI water used with no remineralisation or buffering, especially in shrimp or planted tanks
  - CO2 injection (planted tanks) overwhelming an already-low KH
  - Driftwood, certain substrates, or peat continuously releasing tannins/acids into an already low-buffer tank
  - A long gap between water changes in a tank with naturally soft source water and no added buffer
immediate_actions:
  - Test KH and pH together, not pH alone — a pH crash without knowing KH looks confusing; a pH crash with 0 KH confirmed is a clear diagnosis.
  - Do NOT attempt to raise pH quickly with chemical pH-up products. A fast pH swing after a crash is more dangerous to survivors than the low pH itself — fish that have survived the crash are adapted to the current (low) reading, and a rapid jump back up is a second shock on top of the first.
  - Raise pH gradually instead: do small water changes (10-15%) with water that has moderate KH/hardness, spaced several hours to a day apart, watching how fish respond between each change.
  - Add a KH buffer (crushed coral, baking soda in carefully measured small doses, or a commercial buffer) gradually, aiming to raise KH slowly over days, not hours.
  - Increase aeration — a low-pH crash is often accompanied by elevated CO2, and extra surface agitation helps off-gas it.
  - Once stabilised, identify and fix the underlying KH-depletion cause (see likely_causes) so it does not recur.
do_not_do:
  - Do not add pH-up or baking soda in a large single dose to "fix" the crash immediately. Fast pH swings are more dangerous than the low pH itself once fish have partially adapted to it.
  - Do not do one large water change with normal tap water straight after discovering a crash if the tap water's pH/KH is significantly higher than the tank's current reading — treat this the same cautious, gradual way as recovering from any pH swing.
  - Do not assume the crash is a one-off event without checking KH — if KH is still very low or 0, the same crash will recur on the same timeline unless the buffering capacity is actually restored.
  - Do not use RO or very soft water for water changes without remineralising it first in a tank that has already shown KH exhaustion.
when_to_escalate:
  - Repeated pH crashes on a predictable cycle (e.g. every few weeks) despite adding buffer — this points to an ongoing acid source (driftwood, substrate, CO2 system) that needs identifying, not just repeated buffering.
  - Any tank with shrimp or other especially pH-sensitive invertebrates that has crashed — these often need a slower, more carefully monitored recovery than fish-only tanks.
treatments:
  - name: Gradual water changes with moderate-KH water
    dose: 10-15% per change, spaced several hours to a day apart
    duration: Over 2-4 days until pH and KH stabilise at a normal level
    dangerous_to: [none_known_when_done_gradually]
    notes: The safest recovery path. The goal is a slow climb back, not a fast correction.
    source: https://www.fishkeepingworld.com/ph-crash-in-fish-tank/
  - name: Crushed coral or aragonite substrate/media (as a KH buffer)
    dose: A small mesh bag in the filter, adjusted by testing KH over several days
    duration: Ongoing — dissolves gradually and needs monitoring/replacing
    dangerous_to: [soft_water_species_if_overdone, plants_sensitive_to_high_hardness]
    notes: A gentle, self-limiting way to add buffering capacity — it dissolves faster in lower-pH water and slower as pH rises, which is a naturally safer curve than a one-time chemical dose.
    source: https://www.fishkeepingworld.com/ph-crash-in-fish-tank/
  - name: Commercial pH buffer / baking soda (sodium bicarbonate)
    dose: Very small, carefully measured doses, re-testing KH before each addition
    duration: As needed, added gradually over days
    dangerous_to: [rapid_swings_if_overdosed, soft_water_and_blackwater_species]
    notes: Effective but easy to overdose relative to how little is actually needed — measure, wait, re-test, rather than dosing to a target number in one go.
    source: https://www.fishkeepingworld.com/ph-crash-in-fish-tank/
sources:
  - https://www.fishkeepingworld.com/ph-crash-in-fish-tank/
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
confidence: medium
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Carbonate hardness (KH) is what keeps pH stable — it is the water's buffering capacity, the thing that
absorbs the small, constant acid production of a healthy nitrogen cycle without letting pH actually move.
That buffering capacity is finite. In tanks with naturally soft source water, or tanks that never get
enough hardness added back via water changes, KH is consumed a little at a time until it hits zero — and
once it does, pH has nothing left to resist it and can fall very fast, sometimes overnight, often by
several whole points.

This is why a pH crash reads as sudden and mysterious to the keeper even though the underlying cause (KH
slowly running out) was building for weeks. The practical trap is what happens next: fish that survive the
initial crash partially adapt to the new, lower pH within hours, so the instinctive "fix" — dosing a strong
buffer or doing a big water change with normal-KH tap water to snap pH back up fast — is itself a second,
often more lethal shock. The safe recovery path mirrors the general rule for any large water-parameter
swing: move it back gradually, in small steps, watching the fish between each one, not in one corrective
jump.

Preventing a recurrence means testing KH periodically, not just pH, since pH alone can look perfectly
normal right up until the buffer runs out.
