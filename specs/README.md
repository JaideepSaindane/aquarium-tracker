# Specs

One task per file. Work them one at a time.

**How to use these.** In Claude Code, say *"do T-011"* (or use the `/task T-011` command). Claude reads that spec plus its dependencies, then works. When it says it is done, check the acceptance criteria yourself by using the app — do not accept "it should work." Then say *"commit this"* and move on.

**Every spec has acceptance criteria you can verify without reading code**, except a handful marked *"Claude verifies this one, not Jaideep"* — those involve inspecting the built app and are Claude's job to check and report honestly.

---

## Phase 0 — before any app code

Prove the wedge works before building around it. Do not skip this.

| Task | Title | Depends on |
|---|---|---|
| T-001 | Tank Scan prompt harness (web) | — |
| T-002 | Accuracy evaluation against 50 real photos | T-001 |
| T-003 | Expand species seed data to 150 | — |
| T-004 | Content corpus structure and in-app reader | — |

T-003 and T-004 can run in parallel with T-001/T-002.

**Gate:** you can produce a Tank Report a real hobbyist calls "actually right" without editing it by hand. If species identification lands below roughly 70% on decent photos, or false positives are common, stop and reconsider — better to learn that in week one than month four.

## Phase 1 — the app

| Task | Title | Depends on |
|---|---|---|
| T-010 | Next.js web app scaffold, routing, theme | — |
| T-011 | Local database, schema, migrations | T-010 |
| T-012 | Export and backup | T-011 |
| T-013 | AI proxy (Next.js API routes) and provider adapter | T-001, T-004 |
| T-014 | Photo capture and quality gate | T-010 *(tuned against T-002's photos)* |
| T-016 | Tank profile and livestock | T-011 |
| T-017 | Parameter logging, graphs, thresholds | T-011 |
| T-018 | Reminders, calendar, Web Push reliability | T-011 |
| T-021 | Species Dex | T-011, T-016 |
| T-015 | Tank Scan flow and Tank Report | T-011, T-013, T-014, T-016, T-018, T-021 |
| T-019 | Ask AquaAI | T-013, T-016, T-017, T-018 |
| T-020 | Emergency triage | T-011, T-013, T-018 |
| T-022 | Journal, photos, livestock timeline | T-011, T-020 |
| T-024 | Hinglish and i18n | T-010 |
| T-023 | Onboarding | T-015, T-016, T-020, T-024 |
| T-025 | Free tier limits and Pro subscription | T-010, T-013 |
| T-026 | Local metrics and the 90-day survival prompt | T-011, T-016 |

### Build order

The table above is sorted in a workable order — **it is not the same as the numeric order.** T-015 is the hero feature but it writes livestock, equipment, reminders and Dex cards, so those have to exist first. Follow the table top to bottom:

> T-010 → T-011 → T-012 → T-013 → T-014 → T-016 → T-017 → T-018 → T-021 → **T-015** → T-019 → T-020 → T-022 → T-024 → T-023 → T-025 → T-026

T-024 (i18n) is listed late but the *i18n layer itself* is set up in T-010. What T-024 adds is the Hinglish translations and the language switching. Do not write untranslated string literals in the meantime — see `CLAUDE.md`.

**Ship gate:** a beginner with no account can scan a tank, get a report, and set up reminders in under four minutes — offline for everything except the scan itself.

---

## Running in parallel with all of the above

Three things that are not code and gate the launch date:

1. **No Play testers or closed-testing gate for a web app** — see `docs/06-shipping.md` (rewritten 2026-08-31). Recruiting a handful of real early users to try the app before wide launch is still a good idea, just not a Google-mandated calendar constraint anymore.
2. **Write the safety corpus.** The topics are listed in `docs/05-content-guide.md` §2. This grounds every AI answer and no AI can do it for you reliably. A few hours a week from now until launch.
3. **Line up reviewers.** The corpus has three review tiers. Tier 1 — anything recommending a medication, a dose or a treatment protocol — needs a named aquatic vet or credentialled aquaculture professional before the AI may cite it. Tier 1 entries can ship as identification-and-when-to-escalate only, with treatments withheld, until that review happens. Tier 2 needs a named experienced hobbyist. Tier 3 is you, with sources cited. Start asking around for a Tier 1 reviewer early — it is the longest lead time in the project.

## Phase 2 — not sequenced yet

| Task | Title | Depends on |
|---|---|---|
| T-027 | Guided Tank Setup Planner | T-015 |
| T-028 | Home / Cross-Tank Calendar | T-011, T-016, T-018 |
| T-029 | Always-on shared server (needs a decision session first — see the spec) | T-018 |
