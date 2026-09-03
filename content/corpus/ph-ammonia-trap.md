---
id: ph-ammonia-trap
title: pH–Ammonia Trap (Low pH + Accumulated Ammonia)
status: sourced
review_tier: 2
aliases:
  - ph ammonia trap
  - water change killed my fish
  - fish died after water change
  - low ph high ammonia
  - acidic tank ammonia
  - paani badalne ke baad machhli mar gayi
  - ph kam ammonia zyada
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Fish that were stable, or only mildly stressed, die or crash within minutes to hours of a water change
  - Gasping, darting, or lying on the side shortly after adding new water
  - A tank with low pH (below 7.0) that has been neglected or under-maintained for a while
  - Ammonia test reads meaningfully above 0 alongside a low pH reading
likely_causes:
  - A long-neglected or overdue tank has let pH drift down (from CO2 buildup, low KH, driftwood tannins, or an overdue water change) while ammonia has also accumulated
  - At the low pH the ammonia was sitting mostly as ammonium (NH4+), which fish tolerate far better than free ammonia (NH3)
  - A well-intentioned large water change with normal tap water (usually pH 7–8) raises the tank's pH quickly
  - The pH rise converts the stored ammonium to free ammonia almost immediately, and the fish that were surviving the ammonium are not tolerant of the ammonia
immediate_actions:
  - Test pH, total ammonia, nitrite and temperature before doing anything else. This entry only applies when pH is below 7.0 AND total ammonia is at or above 0.5 ppm — confirm both before changing your water-change plan.
  - "If pH is below 7.0 AND total ammonia is at or above 0.5 ppm: do several small water changes of 20–25%, using water matched as closely as possible to the tank's current pH, spaced hours apart rather than one large change."
  - "If pH is below 7.0 AND total ammonia is at or above 5 ppm: do not water-change in place at all. Moving the fish to already-cycled, parameter-matched water is safer than changing the water they are currently in (see when_to_escalate)."
  - Dose an ammonia-binding dechlorinator (Seachem Prime or equivalent) at label rate before and after each small change — it buys hours, it does not replace the small-change approach.
  - Re-test pH and ammonia between each small change. Stop increasing water-change size until both are trending down together, not just ammonia.
  - Once total ammonia is reliably below 0.5 ppm, the pH-matching requirement relaxes and normal water-change guidance (see corpus:water-change-basics) applies again.
do_not_do:
  - Do not do one large water change with ordinary tap water when pH is below 7.0 and total ammonia is at or above 0.5 ppm. This is the single most dangerous "helpful" action available in this scenario — it converts relatively harmless ammonium into acutely toxic free ammonia within minutes, in a tank whose fish were adapted to the lower-pH, lower-toxicity state.
  - Do not chase the pH upward with a buffer or "pH up" product at the same time as a water change. Two simultaneous pH-moving actions make the outcome unpredictable.
  - Do not assume a "healthy-looking" low-pH tank is fine to change normally. The trap specifically catches tanks that look stable — the fish's apparent stability is what makes the standard "just do a water change" instinct dangerous here.
  - Do not skip testing ammonia because pH already looks low. Both conditions — pH below 7.0 AND total ammonia at or above 0.5 ppm — must be true for this entry to apply; treat a tank that only meets one condition using the relevant single-topic guidance instead (see corpus:ammonia-spike for ammonia without a low-pH complication).
when_to_escalate:
  - pH below 7.0 AND total ammonia at or above 5 ppm — do not attempt to fix this in place. Moving the fish to a separate, already-cycled container with water matched to the tank's current parameters is safer than any water-change strategy at this ammonia level.
  - Fish showing acute distress (spinning, convulsing, gasping hard) regardless of the exact numbers — treat as an emergency and prioritise getting them into cleaner, parameter-matched water over precise dosing.
  - pH and ammonia not trending down together after several small changes over 24 hours — the underlying cause (overdue maintenance, a dying biofilter, an unnoticed decomposing source) needs to be found, not just diluted.
treatments:
  - name: Staged small water changes with pH-matched water
    dose: 20–25% per change, water pH-matched as closely as practical to the tank's current reading, spaced several hours apart
    duration: Repeated until total ammonia is reliably below 0.5 ppm and pH has stabilised
    dangerous_to: [none_known_when_pH_matched]
    notes: The core protocol for this trap. The point of the smaller size and pH-matching is to remove ammonia without moving pH far or fast enough to convert what remains into its toxic free form. Slower than a single large change by design.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - name: Relocate fish to cycled, parameter-matched water
    dose: N/A — a physical move, not a dose
    duration: Immediate, for the ≥5 ppm ammonia escalation case only
    dangerous_to: [transport_stress_if_temperature_or_pH_not_matched_at_destination]
    notes: Reserved for the higher-ammonia escalation tier. Match temperature and pH at the destination as closely as possible; this is still safer than attempting to fix 5+ ppm ammonia in a low-pH tank by changing water in place.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-08-30
review_due: 2027-02-28
---

Total ammonia measured by a test kit is really two chemicals in one number: ammonium (NH4+), which fish
tolerate reasonably well, and free ammonia (NH3), which is roughly a hundred times more toxic. The split
between them is controlled almost entirely by pH (and, to a lesser extent, temperature). At low pH, most
of the total ammonia sits as the far-less-toxic ammonium. That is the trap: a neglected tank can have real,
elevated ammonia and still look survivable, because its low pH is quietly keeping most of that ammonia in
its safer form.

A standard water change uses tap water, which in most places is pH 7–8 — higher than the trap tank's own
water. Adding a large volume of it raises the tank's pH quickly. As pH rises, the same total ammonia
re-splits toward the toxic NH3 form, and it does this in minutes, not hours. Fish that were coping with the
tank's existing chemistry are suddenly exposed to a spike in the genuinely dangerous molecule, and this is
why "the water change killed my fish" is a real, recurring, avoidable failure mode rather than an
old wives' tale.

The two thresholds below are the operating rule, and they are the only numbers this entry uses anywhere:

- **pH below 7.0 AND total ammonia at or above 0.5 ppm** — several small water changes of 20–25%, with
  water pH-matched to the tank as closely as practical, never one large change.
- **pH below 7.0 AND total ammonia at or above 5 ppm** — escalate. Moving the fish to already-cycled,
  parameter-matched water is safer than changing the water they are currently in.

If pH is at or above 7.0, this entry does not apply — the ordinary ammonia-spike protocol (`corpus:ammonia-spike`)
covers that case, including a standard large water change as the primary fix. This entry exists specifically
for the low-pH complication, because it is the one case where the app's own default advice — "do a water
change" — is the wrong answer if given without the pH check first.
