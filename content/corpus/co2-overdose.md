---
id: co2-overdose
title: CO2 Overdose (Planted Tank)
status: sourced
review_tier: 1
aliases:
  - fish gasping planted tank co2
  - co2 too high aquarium
  - drop checker yellow
  - co2 killing fish
  - pressurised co2 fish dying
  - too much co2 injection
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [invert]
symptoms:
  - Fish gasping at the surface, especially noticeable overnight or early morning (when plants stop producing oxygen but CO2 injection may still be running)
  - A drop checker (if used) showing yellow rather than the target green
  - Sudden lethargy or loss of balance across multiple fish simultaneously, with no other obvious cause
  - Shrimp/invertebrates affected first or more severely than fish, given their generally lower CO2 tolerance
likely_causes:
  - CO2 injection rate set too high for the tank's actual volume and surface agitation
  - CO2 continuing to inject overnight without a timer/solenoid cutoff, while photosynthesis (which consumes CO2) has stopped with the lights off
  - Insufficient surface agitation/gas exchange to offload excess dissolved CO2
  - A sudden system fault (stuck regulator, solenoid failure) causing an uncontrolled excess injection
immediate_actions:
  - Turn off the CO2 injection immediately — this takes priority over everything else.
  - Increase surface agitation immediately (turn up a filter return, add an airstone, or manually agitate the surface) to drive off excess dissolved CO2 as quickly as possible.
  - Move visibly distressed fish to a CO2-free holding container with good aeration if the tank cannot be stabilised quickly enough.
  - Once stabilised, review and reduce the injection rate, and confirm a timer/solenoid is fitted so CO2 injection stops overnight when plants are not consuming it.
  - Reintroduce CO2 at a lower rate and monitor closely with a properly calibrated drop checker before returning to a normal schedule.
do_not_do:
  - Do not run CO2 injection 24 hours a day without a timer/solenoid cutoff — overnight injection with no photosynthesis to consume it is one of the most common causes of an overdose event.
  - Do not rely on a drop checker alone for real-time safety — its reading lags actual dissolved CO2 by roughly an hour, so it warns after the fact, not in the moment; surface agitation and a conservative injection rate are the actual safety margin.
  - Do not restart CO2 injection at the same rate that caused the overdose without first improving surface agitation or adding a proper timer/solenoid — the same conditions will simply reproduce the same event.
when_to_escalate: "Multiple fish gasping or showing distress simultaneously in a CO2-injected tank — treat as an acute emergency requiring immediate CO2 shutoff and aeration, equivalent in urgency to an oxygen depletion event (corpus:oxygen-depletion)."
treatments:
  - name: CO2 injection shutoff + surface agitation
    dose: "Full stop of injection; maximise surface agitation/aeration immediately"
    duration: Until fish/inverts show clear recovery, then reintroduce at a reduced, timer-controlled rate
    dangerous_to: [invert]
    notes: Invertebrates (shrimp especially) are generally more CO2-sensitive than fish and should be the first indicator watched for during dialing-in of a new injection rate.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

CO2 overdose is specific to planted, CO2-injected tanks and is genuinely dangerous because the mechanism —
CO2 displacing dissolved oxygen and directly affecting fish blood chemistry — can move fast, especially
overnight, when photosynthesis has stopped consuming the injected gas but injection may still be running.
This overnight window, not the daytime injection period itself, is the single most common time an overdose
actually happens.

A drop checker is a useful dialing-in tool but is not a real-time safety device — its colour change lags
actual dissolved CO2 levels by roughly an hour, meaning by the time it visibly turns yellow, the tank has
already been at that level for a while. The actual safety margin comes from a conservative injection rate,
good surface agitation to offload excess gas, and critically, a timer/solenoid that stops injection overnight
rather than running it continuously.

Invertebrates, shrimp in particular, are generally more sensitive to elevated CO2 than fish and are a useful
early warning sign when carefully dialing in a new injection setup — watching shrimp behaviour during the
first days of a rate change catches problems before fish show visible distress.
