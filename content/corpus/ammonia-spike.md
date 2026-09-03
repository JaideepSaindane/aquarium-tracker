---
id: ammonia-spike
title: Ammonia Spike / New Tank Syndrome
status: sourced
review_tier: 1
aliases:
  - ammonia spike
  - amonia high
  - new tank syndrome
  - ammonia 2 ppm
  - paani kharab ho gaya
  - nayi tank mein machhli mar rahi hai
  - fish gasping at surface new tank
  - cloudy new tank fish dying
  - ammonia burn
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Gasping at the surface or hanging near the filter outflow
  - Red or inflamed gills; in bad cases gills look burnt or ragged
  - Lethargy, sitting on the bottom, refusing food
  - Clamped fins, darkened colour, red streaks on body or fins
  - In acute poisoning — spinning, disorientation, convulsions
  - Deaths in a tank set up within the last 6–8 weeks
likely_causes:
  - Tank cycled for less time than the biofilter needs (typically 4–8 weeks to establish)
  - Too many fish added at once, or added too soon after setup
  - Overfeeding, or an uneaten food/dead fish decomposing out of sight
  - Filter media rinsed in chlorinated tap water, or replaced entirely, killing the bacteria
  - Filter stopped for hours (power cut) and the media went anoxic
  - Antibiotic or medication course that wiped out the nitrifying bacteria
  - Chloramine in tap water dosed with a dechlorinator that does not bind the ammonia byproduct
immediate_actions:
  - Test ammonia, nitrite, nitrate, pH and temperature now. You cannot judge severity without pH and temperature — the same total ammonia reading is far more toxic at pH 8.2 than at pH 6.8, and more toxic warm than cool.
  - Stop feeding completely. Fish are safe unfed for several days; every gram of food added is more ammonia.
  - Check pH before choosing the water change size. If pH is at or above 7.0, do a water change of 50% or more with temperature-matched, fully dechlorinated water — this is the only action that reliably removes ammonia rather than masking it. If pH is below 7.0 AND total ammonia is at or above 0.5 ppm, do NOT do one large change with higher-pH water; do several small changes of 20–25% with pH-matched water instead (see corpus:ph-ammonia-trap). If pH is below 7.0 AND total ammonia is at or above 5 ppm, escalate: moving the fish to already-cycled, parameter-matched water is safer than changing water in place.
  - Dose a dechlorinator that also binds ammonia (Seachem Prime and equivalents) at label rate for the full tank volume. This converts free ammonia to a less toxic form for roughly 24–48 h; it buys time, it does not fix the cycle.
  - Increase aeration. Ammonia-damaged gills cannot extract oxygen efficiently, so raise surface agitation or add an airstone.
  - Re-test after 4–6 hours and repeat the water change if ammonia is still above 0.25 ppm total. Repeat daily until the biofilter catches up.
  - Do not add any more fish until ammonia and nitrite both read 0 for a full week.
do_not_do:
  - Do not do a single large water change with higher-pH water when pH is below 7.0 AND total ammonia is at or above 0.5 ppm. Raising pH converts stored ammonium (NH4+) into free ammonia (NH3) almost instantly and can kill fish that were surviving. Do several small changes of 20–25% with pH-matched water instead, and tell the user why you are doing it the slow way — the instinct to "just change more water" is exactly what kills the tank here. (See corpus:ph-ammonia-trap. Above 5 ppm total ammonia this escalates — see when_to_escalate.)
  - Do not treat with any medication. Ammonia poisoning is not an infection. Antibiotics will finish off whatever biofilter you have left and make the spike permanent.
  - Do not clean or replace the filter media. That is where your nitrifying bacteria live. If it is genuinely clogged, rinse it gently in water taken out of the tank — never under the tap.
  - Do not rely on ammonia-binding dechlorinator alone as the treatment. It is a holding measure of roughly 24–48 hours, its detoxifying claims are debated, and it does nothing to build the biofilter.
  - Do not use a total-ammonia test result as if it were a toxicity result. Report the number with pH and temperature or the advice is guesswork.
  - Do not add pH-up, buffers, or "ammonia remover" chemicals at the same time as a water change and a dechlorinator. Stacking changes makes the tank unstable in the direction you cannot predict.
  - Do not do a 100% water change on an established but neglected tank (see Old Tank Syndrome, id old-tank-syndrome) — fish adapted to chronically poor water go into osmotic shock.
  - Do not use a seeded sponge or media from a tank with any history of disease. You will transfer the disease along with the bacteria.
when_to_escalate:
  - pH below 7.0 AND total ammonia at or above 5 ppm — moving the fish to already-cycled, parameter-matched water is safer than changing the water in place (Merck). Escalate rather than water-changing.
  - Fish spinning, convulsing, or lying on their side — acute neurological toxicity, minutes matter.
  - Ammonia stays elevated after several large water changes — look for a decomposing source (dead fish behind rocks, dead snail, buried food) or chloramine in the supply.
  - Tap water itself tests positive for ammonia — common where chloramine is used; needs a different dechlorinator and confirmation testing before/after.
treatments:
  - name: Large water change with dechlorinated, temperature-matched water
    dose: 50% or more where pH is at or above 7.0; repeat as needed to hold total ammonia below 0.25 ppm. Where pH is below 7.0 and total ammonia is at or above 0.5 ppm, use several small 20–25% changes with pH-matched water instead.
    duration: Daily until the biofilter establishes
    dangerous_to: [old_tank_syndrome_tanks, ph_below_7_with_ammonia_at_or_above_0_5_ppm, unmatched_temperature]
    notes: The primary and safest intervention. Match temperature within about 1 °C. This is the only step that physically removes ammonia. Two-stage pH guard — pH below 7.0 with total ammonia at or above 0.5 ppm means small pH-matched changes only; pH below 7.0 with total ammonia at or above 5 ppm means move the fish to already-cycled matched water rather than changing water in place.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - name: Ammonia-binding water conditioner (Seachem Prime, Safe and equivalents)
    dose: Label rate for the full tank volume; some manufacturers permit up to 5x label dose in an emergency — confirm on the specific product
    duration: Roughly 24–48 h of protection per dose; not a substitute for water changes
    dangerous_to: [none_known_at_label_dose]
    notes: CONTESTED. Manufacturer claims of ammonia detoxification are debated in the hobby and in independent testing; treat it as a stopgap that buys hours, not a cure. Also note it can cause some ammonia test kits to read misleadingly. Does not remove nitrate.
    source: https://aquariumscience.org/index.php/5-5-3-2-1-prime-safe-and-ammonia/
  - name: Zeolite / ammonia-absorbing resin
    dose: Per product; place in filter flow
    duration: Until exhausted (days to weeks); must be replaced or regenerated
    dangerous_to: [planted_tanks_removes_nitrogen]
    notes: Physically removes ammonia. Removing it later can release ammonia back if not handled correctly. Delays the cycle by starving the bacteria of their food source.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
  - name: Seeded biological media from an established, disease-free tank
    dose: A used sponge, a handful of ceramic media, or a squeeze of established filter mulm
    duration: Single addition; the fastest legitimate way to shorten a cycle
    dangerous_to: [disease_transfer_risk, snail_and_pest_transfer]
    notes: More reliable than any bottled bacteria product. Source only from a tank you trust.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
  - name: Reduced or suspended feeding
    dose: Zero food for 2–4 days, then half rations
    duration: Until ammonia reads 0
    dangerous_to: [fry, very_small_species_with_high_metabolism]
    notes: Free, immediate, and effective. Adult fish tolerate a week without food; fry do not.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
sources:
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - https://aquariumscience.org/index.php/5-5-3-2-1-prime-safe-and-ammonia/
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-08-30
review_due: 2027-02-28
---

A test kit reports total ammonia nitrogen (TAN), which is the sum of two things: ammonium (NH4+), which is
comparatively harmless, and un-ionised ammonia (NH3), which is roughly a hundred times more toxic. What
splits the total between them is pH and temperature. Higher pH and higher temperature push the balance
toward NH3. This is why 1 ppm total ammonia in a soft, acidic, 24 °C tank is a manageable problem while
1 ppm in a hard, alkaline, 30 °C African cichlid tank is an emergency — and why any advice given from the
ammonia number alone is unreliable.

Reference points: un-ionised ammonia below 0.05 mg/L is generally considered non-harmful, gill damage
begins around that level, and 2 mg/L is lethal to many species. On total ammonia, freshwater fish should
be under 1 mg/L, with the practical aquarium target being zero. (AquaAI is freshwater-only; marine
figures are deliberately not carried here.)

New tank syndrome is the same problem with a known cause: the nitrifying bacteria that convert ammonia to
nitrite and nitrite to nitrate take about 4–8 weeks to establish, and fish added before then are living in
their own waste. There is no product that removes that requirement. Water changes and not feeding are what
carry the fish through it.

One trap deserves naming, and it has two stages. In a tank where pH has fallen and ammonia has
accumulated, most of the ammonia is sitting as relatively safe NH4+. Dumping in a large volume of
higher-pH tap water flips it to NH3 in minutes.

- **pH below 7.0 AND total ammonia at or above 0.5 ppm** — do not do a single large water change with
  higher-pH water. Do several small changes of 20–25% with pH-matched water, and explain to the user why:
  each small change removes ammonia without moving pH far enough to convert what is left into its toxic
  free form.
- **pH below 7.0 AND total ammonia at or above 5 ppm** — escalate. Moving the fish to already-cycled,
  parameter-matched water is safer than changing the water in place (Merck).

These two numbers, 0.5 ppm and 5 ppm, are the only thresholds for this trap anywhere in the product.
The full entry is `corpus:ph-ammonia-trap`.
