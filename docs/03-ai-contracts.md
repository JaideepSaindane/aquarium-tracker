# 03 — AI contracts

Every AI feature in AquaAI is a **contract**: a versioned prompt, a strict JSON output schema, and rendering rules. Nothing returns free prose to the user.

Why this matters more than the model choice: an ungrounded language model will confidently tell someone to dose copper into a shrimp tank. Structure, grounding and citation are what stand between this app and a review that says it killed someone's fish.

---

## Rules that apply to every contract

1. **Retrieval first, generation second.** Every call retrieves relevant corpus entries (`docs/05-content-guide.md`) and species rows (`data/species.seed.json` → `species` table) and puts them in the prompt. The model answers *from* that material.
2. **Every claim cites its source.** Responses carry `grounding_refs`. An answer with no citation is a bug, not a style choice.
3. **JSON only, validated against schema.** The proxy validates before returning. On failure: retry once, then return a structured "could not analyse" — never pass malformed data to the app.
4. **Confidence gating.** Below the stated threshold, return a question instead of an assertion.
5. **Name what you could not determine.** Every contract has a field for this. Under-claiming builds the trust the whole product runs on.
6. **Never output a dose without confirmed volume and confirmed inhabitants.** If either is missing, return a question.
7. **Prompt versions are strings** (`tank-scan/v1`), stored with every response, so old outputs can be re-evaluated when a prompt changes.
9. **Species and corpus references use the canonical ids.** Species ids are **common-name kebab-case slugs** (`neon-tetra`, `amano-shrimp`, `rosy-barb`) — not scientific-name slugs. Corpus ids are the filenames in `content/corpus/`. A reference that does not resolve is a build error.
10. **No improvisation on safety-critical questions.** Per `docs/05-content-guide.md` §1, three cases: a safety, medical or care-parameter question with no corpus hit gets **no answer** — say so plainly and offer to write it up; a general non-safety hobby question ("what does a sponge filter do") may be answered from general knowledge, flagged `uncovered: true` with no `grounding_refs`; anything touching medication, dosing, disease or a specific care parameter is always the first case.
8. **Images downscaled to ~1024px longest edge** before upload. Cap output tokens on every call.

---

## The safety rails, verbatim

These belong in every system prompt. They are not suggestions.

```
NEVER give a medication dose unless tank volume in litres AND all inhabitants
  (fish, shrimp, snails, plants) have been confirmed. Ask instead.
NEVER recommend treating before testing water. Most illness in beginner tanks
  is water quality.
NEVER recommend more than one medication at a time.
NEVER state a single figure where reputable sources disagree. Give the range
  and say sources differ.
NEVER claim certainty from a photo. State confidence and say what you could
  not see.
ALWAYS check for the pH-ammonia trap before recommending any water change.
  Below pH 7.0, ammonia sits in its less toxic ionised form; adding higher-pH
  tap water converts it to toxic free ammonia within minutes and can kill fish
  that were surviving. Two stages, and use exactly these thresholds:
    pH < 7.0 AND total ammonia >= 0.5 ppm
      -> do NOT do one large change. Recommend several small changes
         (20-25%) with pH-matched water, and explain why.
    pH < 7.0 AND total ammonia >= 5 ppm
      -> escalate. Moving the fish to already-cycled, parameter-matched
         water is safer than changing water in place.
ALWAYS warn when a treatment is dangerous to a specific inhabitant present:
  salt harms many catfish, loaches and tetras, and many plants; copper is
  lethal to all invertebrates. For malachite green with formalin: it is not
  categorically unsafe for scaleless fish, shrimp or snails - dose strictly to
  the specific product's label, never above and never halved, never with eggs
  or fry present, and treat any label that excludes scaleless fish or
  invertebrates as prohibiting that tank.
ALWAYS answer in the language of the user's question (English or Hinglish),
  but keep species names, chemical names, medication names, parameter names
  and units in English/Latin. Never transliterate "ammonia".
```

---

## Contract 1 — Tank Scan

**`tank-scan/v2`.** The product wedge. Input: one tank photo, dimensions, city, and — new in v2, 2026-09-04 — an optional **tank record** (`buildTankContext(tankId)`: the tank's own logged equipment, livestock, recent water parameters, and recent log entries), sent only for a **Tank Check** re-run of an already-set-up tank, never a first onboarding scan. Output: a Tank Report. Jaideep's ask: tank analysis shouldn't be a one-time onboarding event — `/tank/[id]/check` lets it run again anytime, and giving it the tank's real record (not just the bare photo) lets findings reference actual logged equipment/bioload/parameter trends instead of only what's visible in the image. The species-identification restriction below is unchanged by this — the record may name livestock the user already added by hand, but the model still never identifies a species from the photo itself. See `prompts/tank-scan.v2.md` for the exact re-check rules this unlocks.

**Livestock (species) identification is deliberately out of scope for this contract**, decided 2026-08-31 after T-002's accuracy evaluation against 25 real photos: equipment (94%), algae type (88%) and count accuracy (83%) were strong; species ID on schooling nano fish was weak (37.5%), including a confident wrong call on an easy photo. Tank Scan now reports only what a photo answers reliably — equipment, hardscape/setup, plants, algae, condition. Species go in by hand (T-016), with an optional single-fish photo-ID assist (Contract 6, below) for anyone who doesn't know what they have. If livestock identification is ever revisited, it must clear its own T-002-style evaluation before being added back to this contract's output schema.

### System prompt

```
You are an experienced freshwater aquarium keeper examining a photograph of
someone's tank. You are careful, specific and honest about uncertainty. You
are not a salesperson and you never recommend buying something that is not
needed.

You will receive:
  - a photograph of an aquarium
  - the tank's dimensions in cm and calculated volume in litres
  - the user's city (for ambient temperature and water hardness context)
  - optionally, a second photograph of the equipment
  - retrieved care corpus entries

You do NOT identify fish, shrimp or snail species in this report. Do not
name, count, or guess at livestock species at all, even informally in a
finding's text. If livestock is relevant to a finding (e.g. "no heater"),
phrase it generically ("if you're keeping tropical fish") rather than naming
a species you inferred from the photo. The user adds their livestock by hand
after this report; a separate feature helps identify one fish at a time from
its own close-up photo.

Return ONLY JSON matching the provided schema.

How to judge:
  - Report what you can actually see. Do not infer a heater exists because
    most tanks have one.
  - Footprint matters more than volume — note it in `hardscape` even though
    livestock isn't assessed here, since it matters once species are added.
  - Setup type: classify what kind of tank this is (bare-bottom, planted,
    aquascaped/hardscape-focused, jungle/heavily planted, biotope-style) —
    this is something a photo answers reliably and it drives what maintenance
    advice makes sense.
  - Algae: identify type where possible (green spot, green dust, hair,
    black beard, staghorn, diatoms, cyanobacteria) because the treatment
    differs completely. Diatoms in a new tank are normal and should be
    described as such, not as a problem.
  - Cloudiness in a tank under three weeks old is usually a bacterial bloom
    and normal. Say so rather than alarming the user.
  - Consider ambient temperature for the city given only for equipment
    findings (e.g. "no heater visible, and Bangalore drops to ~19C in
    December/January") — never tie this to a specific species you cannot
    confirm is present.

Severity:
  fix_now  - equipment/water-quality problems that will harm any fish soon
  watch    - suboptimal, will cause problems if it continues
  improve  - would make the tank better, no urgency
```

### Output schema

```jsonc
{
  "prompt_version": "tank-scan/v1",
  "image_quality": {
    "usable": true,
    "issues": ["glare", "low_light", "blurry", "too_far", "reflection"],
    "advice": "Turn off the room light and shoot straight on through the front glass."
  },
  "tank_estimate": {
    "visible_water_level_ok": true,
    "clarity": "clear | slightly_hazy | cloudy | tinted",
    "clarity_note": "Slight haze consistent with a new-tank bacterial bloom."
  },
  "setup": {
    "type": "bare_bottom | planted | aquascape | jungle | biotope | unclear",
    "confidence": 0.8,
    "note": "Densely planted with driftwood hardscape, no visible livestock assessed."
  },
  "plants": [{
    "label": "Anubias barteri", "confidence": 0.81, "condition": "healthy | melting | algae_covered | etiolated"
  }],
  "plant_mass": { "score": 0.35, "descriptor": "lightly planted" },
  "algae": [{
    "type": "green_spot | green_dust | hair | black_beard | staghorn | diatom | cyanobacteria | none",
    "severity": "trace | moderate | heavy",
    "location": "glass | hardscape | plants | substrate",
    "confidence": 0.66
  }],
  "equipment_visible": [{
    "type": "filter | heater | light | co2 | air_stone | none_visible",
    "subtype": "hang_on_back | sponge | canister | internal",
    "confidence": 0.9
  }],
  "hardscape": { "substrate": "gravel | sand | aquasoil | bare | unknown", "decor": ["driftwood"] },
  "scores": {
    "health": 0.68,          // 0-1, overall condition based on visible water/plant/algae state only
    "algae_burden": 0.3,
    "planting": 0.35
  },
  "findings": [{
    "id": "no-heater-visible",
    "severity": "fix_now | watch | improve",
    "title": "No heater visible",
    "explanation": "If you're keeping tropical fish, Bangalore indoor temperatures drop to around 19 C in December and January.",
    "recommended_action": "If your fish need warmer water than your room reaches, add a heater sized to this tank's volume.",
    "grounding_refs": ["corpus:temperature-swings"],
    "confidence": 0.83
  }],
  "recommended_maintenance": [{
    "preset_type": "water_change | filter_clean | dose | co2_refill | trim | test",
    "interval_days": 7,
    "why": "A 65 L tank with this setup type and no live plants needs weekly changes as a starting point - adjust once livestock is added.",
    "suggested_amount": "25%"
  }],
  "could_not_determine": [
    "Whether a filter is running - none is visible in this angle"
  ],
  "clarifying_questions": [{
    "id": "co2-injected",
    "question": "Is this tank running CO2 injection?",
    "type": "choice",
    "why": "Changes the maintenance schedule and what algae types are more or less likely."
  }],
  "grounding_refs": ["corpus:..."]
}
```

### Rendering rules

- `image_quality.usable: false` → do not show a report. Show the advice and a retake button. **Never analyse a bad photo** — a confident wrong answer costs more than a retake.
- Findings render as cards grouped by severity, `fix_now` first, each with its explanation visible without tapping.
- Every finding shows what it was based on. Tapping a `grounding_ref` opens that corpus entry.
- `could_not_determine` renders as a visible, unapologetic list. This is a feature.
- `clarifying_questions` render as inline inputs that update the report in place.
- Confidence below 0.5 renders the label with a "not sure" marker; below 0.35 it becomes a question rather than a finding.
- **Immediately after the report, prompt livestock entry**: "Now add what's living in this tank" → the species picker from T-016, one species at a time, with the "I don't know this fish" photo-ID assist (Contract 6) offered inline. This is the step that used to be automatic; now it is the natural next action, not a separate menu buried in Settings.

### Where this feeds

On accept: equipment rows created, plants created, setup type and scores stored on the tank. The user is then walked straight into adding livestock (T-016) — once added, `compat/v1` (Contract 4) runs per addition and unlocks Dex cards, and `recommended_maintenance` is refined using the now-known livestock. Onboarding is complete once livestock is added, not at the scan step alone.

---

## Contract 2 — Ask AquaAI

**`ask/v1`.** Grounded question answering with the tank's full context attached automatically. The user never has to explain their setup — that is the whole advantage over a search engine or a Facebook group.

### Context assembled automatically

```
tank: dimensions, volume, water type, planted, CO2, city, age
livestock: every species and count, with care ranges
plants, equipment
recent measurements: last 5 of every parameter, with target ranges
recent events: last 10 log entries
```

### System prompt (abridged)

```
You are answering a question from someone who keeps freshwater aquariums.
You have their tank's full details; use them. Do not ask for information
you already have.

Answer from the retrieved corpus entries and species data provided.

If the retrieved material does not cover the question:
  - If the question touches medication, dosing, disease, or a specific care
    parameter: DO NOT ANSWER. Say plainly that you do not have grounded
    guidance on this yet, offer to write it up, and suggest asking the
    community. Never improvise on these.
  - If the question is general and not safety-critical (for example "what
    does a sponge filter do"): you may answer from general principles, set
    uncovered: true, and return no grounding_refs.

Be direct and specific. Give numbers where numbers exist. Where reputable
sources disagree, give the range and say they disagree - do not pick one
and present it as settled.

[safety rails block, verbatim]

Answer in the same language the question was asked in: English or Hinglish.
Keep species, chemical, medication and parameter names in English/Latin
always.
```

### Output schema

```jsonc
{
  "prompt_version": "ask/v1",
  "answer": "Short, direct, 2-5 sentences.",
  "detail": "Optional. Longer explanation, shown on 'tell me more'.",
  "confidence": "high | medium | low",
  "based_on_your_tank": [
    "Your tank is 60x30x36 cm (65 L)",
    "You have 6 neon tetras and 2 amano shrimp"
  ],
  "actions": [{
    "label": "Set a reminder to test ammonia daily",
    "type": "create_task | log_measurement | open_species | open_corpus | none",
    // payload shape depends on type:
    //   create_task      { preset_type, title, interval_days, tank_id }
    //   log_measurement  { parameter_name, tank_id }        // opens the entry screen prefilled
    //   open_species     { species_id }                     // common-name slug
    //   open_corpus      { corpus_id }
    //   none             {}
    "payload": { "preset_type": "test", "title": "Test ammonia", "interval_days": 1 }
  }],
  "warnings": [{
    "severity": "critical | caution",
    "text": "Copper-based medication would kill your amano shrimp."
  }],
  "grounding_refs": ["corpus:nitrogen-cycle", "species:amano-shrimp"],
  "uncovered": false,
  "follow_up_questions": ["What is your current ammonia reading?"]
}
```

`based_on_your_tank` is what makes this feel like the app knows you. Always populate it; showing the user which of their own facts shaped the answer is the single cheapest trust mechanism in the product.

---

## Contract 3 — Emergency triage

**`triage/v1`.** The highest-emotion, highest-liability moment in the app. Someone's fish is dying at 11pm. **Free forever, unlimited, never behind a paywall** — Principle 02.

Input: optional photo, plus a short guided intake (what is happening, how many affected, how long, most recent water test, tank age).

### Additional rails for this contract

```
Assume the user is panicking and will act on the first thing you say. Put the
single most important action first and keep it to one sentence.

If the tank is under 8 weeks old, treat new tank syndrome as the leading
hypothesis until water tests rule it out. It is by far the most common cause
and it is treated by water changes and patience, not medication.

If no recent water test exists, testing is the first action. Not medication.
Say plainly that treating blind usually makes things worse.

Explicitly list what NOT to do. Panicking keepers dose three medications at
once, do a 100% water change, or raise the temperature for a species that
cannot tolerate it. Naming these prevents more deaths than the treatment
advice does.

If the situation is beyond what this app should handle - suspected
mycobacteriosis, mass sudden death, anything involving human skin lesions
after tank contact - say so and recommend an aquatic vet. Mycobacteriosis is
transmissible to humans; if it is suspected, say so directly.
```

### Output schema

```jsonc
{
  "prompt_version": "triage/v1",
  "first_action": "Test ammonia and nitrite right now, before doing anything else.",
  "hypotheses": [{
    "id": "new-tank-syndrome",
    "name": "New tank syndrome (ammonia poisoning)",
    "likelihood": "likely | possible | unlikely",
    "reasoning": "Your tank is 12 days old and fish were added on day 2.",
    "confirm_by": "An ammonia reading above 0.25 ppm confirms it.",
    "grounding_refs": ["corpus:ammonia-spike"]
  }],
  "immediate_actions": [{
    "order": 1,
    "action": "Test ammonia, nitrite and pH.",
    "why": "Treatment depends entirely on the result.",
    "caution": null
  }],
  "do_not": [
    "Do not add any medication yet.",
    "Do not do a 100% water change - it will remove what beneficial bacteria you have.",
    "Do not add more fish."
  ],
  "conditional_guidance": [{
    "if": "total ammonia is at or above 0.5 ppm AND pH is below 7.0",
    "then": "Do several small water changes (20-25%) with pH-matched water rather than one large one, and say why. At or above 5 ppm, move the fish to already-cycled matched water instead.",
    "grounding_refs": ["corpus:ph-ammonia-trap"]
  }],
  "escalate": {
    "needed": false,
    "reason": null,
    "human_health_warning": null
  },
  "confidence": "medium",
  "could_not_determine": ["Whether the white patches are fungal or bacterial from this photo"],
  "clarifying_questions": [{
    "question": "Are the white patches fuzzy and cotton-like, or fine and grain-like?",
    "why": "Fuzzy suggests fungus or columnaris; grain-like suggests ich. The treatments are different."
  }],
  "grounding_refs": []
}
```

`do_not` is rendered as prominently as the actions, not hidden below them.

---

## Contract 4 — Compatibility check

**`compat/v1`.** Runs when a user adds livestock, and on demand ("will these live with my guppies?").

**This contract must never block a save.** Principle 01. It returns warnings; the app records what the user actually has regardless. Aquareka lost a full star to getting this wrong.

```jsonc
{
  "prompt_version": "compat/v1",
  "verdict": "fine | caution | poor_match",
  "conflicts": [{
    "type": "temperature | ph | hardness | temperament | footprint | volume | schooling | predation | fin_nipping",
    "severity": "critical | significant | minor",
    "explanation": "Rosy barbs prefer 16-24 C; your neon tetras are at 24 C. The overlap is narrow and both will be at the edge of their range.",
    "with": ["rosy-barb", "neon-tetra"],
    "mitigation": "A longer tank with more cover reduces fin-nipping risk considerably.",
    "grounding_refs": ["species:rosy-barb"]
  }],
  "footprint_note": "Your tank is 90 cm long, which is enough floor area for both kuhli loaches and corydoras despite what shorter tanks would require.",
  "disputed_note": "Sources differ on angelfish minimum volume, from 110 L to 200 L. Yours is 150 L, which is inside the disputed band.",
  "grounding_refs": []
}
```

`footprint_note` exists specifically to get right what Aquareka got wrong. Where a conflict would exist in a short tank but not in a long one, say so.

---

## Contract 5 — Provisional species card

**`species-gen/v1`.** Principle 03. Fires when a user searches for a species not in the database.

```jsonc
{
  "prompt_version": "species-gen/v1",
  "species": { /* exactly the species.seed.json schema */ },
  "verified": false,
  "origin": "ai_generated",
  "uncertainty_note": "Care parameters generated from general knowledge and not yet verified by a human. Treat minimum tank size as approximate.",
  "confidence": "medium",
  "flags": ["uncommon_in_hobby", "sources_likely_to_disagree"]
}
```

Rendered with a visible "unverified" badge and a one-tap "this looks wrong" report. Saved and usable immediately — the user is never blocked. Queued for review; on human verification `verified` flips to true and the badge disappears.

---

## Contract 6 — Single-fish photo identification

**`species-id/v2`.** Added 2026-08-31 (as `v1`) when livestock ID was removed from Tank Scan (Contract 1) after T-002 showed it was unreliable on multi-fish tank photos. This contract is narrower and easier: **one photo of one fish**, ideally close-up and reasonably still — ask the user to fill the frame with a single fish, not the whole tank. Opt-in only, offered from the manual livestock-add flow (T-016) and from the Dex "All" tab's search (T-021 follow-up) as "identify this fish," never automatic.

**Changed to `v2` on 2026-09-03, Jaideep's direct call:** `v1` handed the model our full catalog and told it to only pick from it — which meant a real fish outside our 445 species could never be identified at all, only ever reported as "not in our catalog." `v2` removes that restriction: the model identifies freely from its own knowledge (common name + scientific name), and matching against our catalog happens **after** the model responds, server-side, by comparing the returned scientific/common name against `data/species.seed.json` (`matchSpeciesId()`, `src/server/ai/retrieval.ts`). A candidate ends up with a `species_id` when it happens to be one we carry, and `null` when it isn't — either way the identification itself is shown, never suppressed just because it's outside our catalog.

### System prompt

```
You are an experienced freshwater aquarium keeper and ichthyologist. You will
receive one close-up photograph, ideally of a single fish.

Return ONLY JSON matching the provided schema.

Identify the fish from your own knowledge — do not limit yourself to any
particular catalog or reference list. Rank up to 3 candidate species by how
well they match what is visible (body shape, fin shape, colour pattern, size
cues), each with its common name, scientific name, a confidence from 0 to 1,
and a short reason. It is completely fine, and expected, for the fish to be
a species that isn't in any specific catalog — identify what you actually
see, don't force it toward anything.

Never present a single guess as certain. If the photo shows more than one
fish, or is too blurry/distant/dark to make out identifying features, say
so plainly in `image_quality` and keep candidates low-confidence or empty
rather than guessing.
```

### Output schema

```jsonc
{
  "prompt_version": "species-id/v2",
  "image_quality": {
    "usable": true,
    "issues": [],                          // e.g. "multiple_fish", "blurry", "too_far", "low_light"
    "advice": ""
  },
  "candidates": [{
    "common_name": "Neon Tetra",
    "scientific_name": "Paracheirodon innesi",
    "confidence": 0.55,
    "why": "Blue horizontal stripe with red lower body, small size, schooling posture.",
    "species_id": "neon-tetra"              // added server-side after the model responds — null if it isn't in our catalog
  }],
  "could_not_determine": ["Whether the red is extending the full body length or just the rear half"],
  "clarifying_questions": []
}
```

### Rendering rules

- Shown as "our best guesses — may or may not be in our catalog" with all candidates visible, **never auto-filled as the answer**. The lead candidate is not visually distinguished as "the answer," to avoid anchoring on a guess that might be wrong.
- `confidence` below 0.5 shows a clear "low confidence" marker on that candidate.
- A candidate with a `species_id` is tappable straight to its real Dex card / into the livestock species-picker. A candidate with `species_id: null` shows an explicit "not in our catalog yet" state instead of being silently dropped, with a path to act on it anyway:
  - **From the livestock-add flow (T-016):** routes to `species-gen/v1` (Contract 5) — "add it anyway" generates a provisional card immediately, since the user is actively trying to add this fish to their tank right now.
  - **From Dex search (T-021 follow-up):** offers "suggest adding it" instead — saves the photo and the AI's guess to a `species_suggestions` row for a human to review later (`/dev/species-suggestions`), since Dex is a browsing context, not an active add-to-tank action. See `specs/T-029-shared-backend.md` for the honest limitation that this review queue is local-only today.
- Selecting a matched candidate fills the same species-picker flow a manual search would; nothing about downstream livestock handling changes based on how the species was found.

---

## Versioning and evaluation

Every prompt lives in one file per contract, versioned by filename (`prompts/tank-scan.v1.md`). Every response stores its `prompt_version`.

When a prompt changes:

1. Bump the version.
2. Re-run the stored `raw_response` corpus of past scans against the new prompt.
3. Compare against the ground-truth set built in T-002.
4. Ship only if accuracy improved or held.

This is why `scans.raw_response` is kept forever. It costs almost nothing to store and it is impossible to recreate.

---

## Cost per contract, order of magnitude

At Gemini 3.5 Flash-Lite pricing ($0.10 / $0.40 per million tokens), with images downscaled to 1024px and output capped:

| Contract | Rough cost |
|---|---|
| Tank Scan | fractions of a US cent |
| Ask | less again |
| Triage | comparable to Ask |
| Compatibility | cacheable — should cost once for common pairs |
| Species generation | one-off per species, then stored forever |
| Single-fish photo ID | comparable to Ask — one small image, no full tank photo |

Even a heavy user at 150 AI actions a month costs well under a dollar. **Verify against live pricing before committing**, and note that Gemini 3.6/3.7 Flash double in price on 1 Jan 2027 — do not model economics on promotional rates. The strategic conclusion holds regardless: inference is not the reason to paywall.
