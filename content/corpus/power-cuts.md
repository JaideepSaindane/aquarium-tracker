---
id: power-cuts
title: Power Cuts
status: live
review_tier: 2
aliases:
  - power cut fish tank
  - filter stopped no power
  - load shedding aquarium
  - electricity gone fish tank
  - generator fish tank
  - fish tank power outage
severity: high
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - No direct symptom until power is restored — the risk is in what happens during and immediately after the outage, not a symptom to observe during it
  - After a long outage: gasping fish (oxygen depletion built up during the stopped filter/aeration), and potentially an ammonia spike in the days following (biofilter damage from the stopped filter, see corpus:cycle-crash)
likely_causes:
  - Routine power cuts / load shedding, common in much of India, stopping filtration and aeration for the duration
  - An extended outage (many hours) allowing filter media to go anoxic and the aerobic nitrifying bacterial colony to die back significantly
immediate_actions:
  - If a battery-powered air pump or backup is available, use it during the outage to maintain at least some aeration and water movement.
  - If no backup power is available, manually agitate the water surface periodically (a cup poured back into the tank, gentle stirring) during a long outage to maintain some oxygen exchange, especially for a heavily stocked tank.
  - When power returns, do not assume everything is fine — treat the tank as having potentially undergone both an oxygen depletion event and possible biofilter damage, especially after an outage of several hours or more.
  - Test ammonia, nitrite and oxygen-related symptoms (gasping) over the following 24-48 hours, and be ready to respond with the acute ammonia/nitrite protocols (corpus:ammonia-spike, corpus:nitrite-spike) if needed.
  - When restarting the filter after a long stopped period, consider rinsing the media gently in removed tank water first — anoxic media can release a slug of trapped toxins when flow resumes.
do_not_do:
  - Do not assume a tank is automatically fine once power returns — the real risk window is often the 24-48 hours after restoration, not the outage itself, as the biofilter recovers or an oxygen debt is repaid.
  - Do not restart a filter that was stopped for many hours without a moment's consideration of gently rinsing the media first — resuming flow through fully anoxic media can release trapped toxins in a concentrated pulse.
  - Do not treat frequent power cuts as something to just tolerate without a plan — a battery backup air pump is a low-cost, high-value investment for anyone in an area with routine outages.
when_to_escalate: "An outage long enough (many hours to overnight) combined with any fish showing distress on power restoration — treat as the relevant acute emergency (oxygen depletion or ammonia/nitrite spike) immediately rather than waiting to see if things settle on their own."
treatments:
  - name: Battery-powered backup air pump
    dose: "N/A — equipment, run during any outage"
    duration: For the duration of any power cut
    dangerous_to: [none_known]
    notes: The single most effective preventive measure for anyone in an area with routine power cuts — inexpensive relative to the risk it mitigates.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
confidence: high
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Power cuts are routine in much of India, and their real danger to a fish tank is often misunderstood — it
is not primarily the outage itself that causes harm, but the compounding effects that follow: a stopped
filter means stopped aeration (leading toward oxygen depletion the longer it continues, see
corpus:oxygen-depletion) and, for a long enough outage, the aerobic nitrifying bacteria in the filter media
can die back significantly from lack of oxygen, setting up a biofilter crash once the filter restarts (see
corpus:cycle-crash).

This means the highest-risk window is often not during the outage but in the 24-48 hours after power
returns, as any oxygen debt is worked through and, separately, the biofilter either recovers or shows signs
of having been damaged via a delayed ammonia or nitrite spike. Testing water parameters in the days
following a significant outage, not just checking that fish "look okay" once the lights come back on,
catches problems the eye alone will miss.

A battery-powered backup air pump is a genuinely worthwhile, low-cost investment for anyone in an area with
routine load shedding — it maintains aeration and water movement through an outage and meaningfully reduces
the risk of both oxygen depletion and the downstream biofilter damage that a long stopped filter can cause.
