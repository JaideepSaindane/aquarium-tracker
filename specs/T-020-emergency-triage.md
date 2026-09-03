# T-020 — Emergency triage

**Phase 1 · Depends on: T-011, T-013, T-018 · Size: 2 days**

## Goal

Someone's fish is dying at 11pm. Get them to the right first action in under a minute, and stop them making it worse.

## Why

This is the highest-intent moment in the hobby and the highest-liability moment in the app. It is also the acquisition moment — people search "white spots on fish" at midnight. **Free forever, unlimited, never behind a paywall, never counted against quota.** Principle 02.

## In scope

- **Reachable from everywhere**: the stage picker in onboarding, a persistent entry point in the app, and a home-screen shortcut if cheap to add.
- **Guided intake, not a blank box.** A panicking person cannot compose a good question. Ask: what is happening (pick from a visual list — spots, fuzz, clamped fins, gasping at surface, lying on bottom, not eating, sudden deaths, cloudy water), how many affected, how long, tank age, most recent water test if any. Optional photo.
- Call `/triage`, render per `docs/03-ai-contracts.md`:
  - **`first_action` at the very top, one sentence, large.** They will act on the first thing they read.
  - `do_not` rendered **as prominently as the actions**, not below them. Panicking keepers dose three medications at once and do 100% water changes; naming these prevents more deaths than the treatment advice does.
  - Hypotheses ranked with likelihood and what would confirm each.
  - `conditional_guidance` shown as clear if/then blocks.
  - `escalate.human_health_warning` shown in full when present — **mycobacteriosis is transmissible to humans and no consumer aquarium app carries this warning.**
  - Clarifying questions inline.
- Log everything from the triage into the tank's `log_entries` as an incident, so the history is preserved. **If no tank exists**, the triage is held in `ai_interactions` only, and the app offers to attach it to a tank if one is created later — `log_entries` requires a `tank_id`.
- Offer to create follow-up reminders: retest in 12 hours, water change tomorrow, end of quarantine.
- Works with no tank set up at all — someone can arrive here on their first launch.

## Out of scope

Medication dosage calculators (Phase 2, and only with confirmed volume and inhabitants). Vet directory.

## Rules that are safety-critical

- **If the tank is under 8 weeks old, new tank syndrome leads until water tests rule it out.** It is by far the most common cause and it is treated by water changes and patience, not medication.
- **If there is no recent water test, testing is the first action.** Say plainly that treating blind usually makes things worse.
- **The pH-ammonia trap must be checked before recommending any water change.** Below pH 7.0, ammonia sits in its less toxic ionised form; adding higher-pH tap water converts it to toxic free ammonia within minutes and can kill fish that were surviving. Two stages, and these exact thresholds are used everywhere in the project:
  - **pH < 7.0 and total ammonia ≥ 0.5 ppm** → several small (20–25%) changes with pH-matched water, never one large one, with the reason explained.
  - **pH < 7.0 and total ammonia ≥ 5 ppm** → escalate: moving the fish to already-cycled, parameter-matched water is safer than changing water in place.

  This is the single most likely way this app could kill someone's fish.
- Never more than one medication at a time.
- Always warn when a treatment is dangerous to a specific inhabitant present — salt harms many catfish, loaches and tetras, and many plants; copper is lethal to all invertebrates. Malachite green with formalin is **not** categorically unsafe for scaleless fish or invertebrates: dose strictly to the specific product's label, never above and never halved, never with eggs or fry present, and treat any label that excludes scaleless fish or invertebrates as prohibiting that tank. (The blanket "harms scaleless fish" claim is wrong and pushes people toward salt or copper, which are genuinely more dangerous for those species — see `docs/05-content-guide.md` §6.)

## Acceptance criteria

1. Emergency is reachable in one tap from the app's main screen and from onboarding.
2. Someone with no tank set up can complete a triage.
3. The intake is all taps and short answers — no free-text requirement.
4. The response leads with one clear first action.
5. The "do not do" list is as visually prominent as the actions.
6. A 12-day-old tank with dying fish and no water test returns "test ammonia and nitrite first" and does **not** recommend medication.
7. A scenario with pH 6.5 and ammonia at 1 ppm produces the small-repeated-changes guidance with an explanation, not "do a large water change". The same scenario at 6 ppm escalates to moving the fish.
8. A scenario suggesting mycobacteriosis produces the human-health warning.
9. Running triage 20 times never hits a quota and never shows a Pro prompt.
10. The triage is saved to the tank's journal as an incident.

## Notes for Claude Code

Write a set of scripted test scenarios (tank age, symptoms, water params) and run them against the contract after any prompt change. Criteria 6, 7 and 8 are regression tests, not one-off checks.
