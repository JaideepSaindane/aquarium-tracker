# T-023 — Onboarding

**Phase 1 · Depends on: T-015, T-016, T-020, T-024 · Size: 2 days**

## Goal

From install to a set-up tank with reminders in under four minutes, with no account.

## Why

The stage picker is the strongest structural idea in the original brief: three genuinely different products behind one door. And Tank Scan means onboarding can replace a twenty-field form with a camera shutter.

## In scope

**Screen 1 — the stage picker.** Three choices, nothing else:

| Choice | Leads to |
|---|---|
| **I'm thinking about getting fish** | A short guided path: what size tank fits your space, what it costs, what to buy, what to avoid. Ends with a tank row saved as `status: 'planned'` (see `docs/02-data-model.md`), and the cycling coach queued for Phase 2. Built out fully in **T-027 (Guided Tank Setup Planner)** — this row is the routing target, not the implementation |
| **I already have a tank** | Straight to Tank Scan (T-015) |
| **Something's wrong right now** | Straight to Emergency triage (T-020), no setup required |

**Do not build a pet-type picker.** The original brief proposed Fish / Paws / Kitty-cat as the first screen; it is cut. Every non-fish option is a dead end that costs credibility in the first five seconds, and it signals "generic pet app", which is the opposite of the positioning.

- **No account, no email, no sign-in.** Anonymous device id only. Aquarium Log won reviews for this: *"Of the three aquarium logging apps I found and tried, this was the only one that didn't force you to login."*
- Language choice — English or Hinglish — offered early and changeable later.
- Permission requests happen **in context**, not upfront. Camera is asked for when the camera opens. Notifications are asked for when the first reminder is created, with the battery-optimisation card following.
- After the first tank exists, a short "here's what this app does" moment — three cards, skippable — pointing at logging, reminders and Ask.
- Onboarding state stored so it is never repeated, and a "start over" option in Settings.
- **Optional local profile (name + city), captured lazily, never as a dedicated screen.** No account is created — this is a single local row (`profile` table) used only to pre-fill a city default on new tanks. It is not shown before the stage picker (would cost time against the four-minute target). Instead it's offered the first time a screen actually needs a city (e.g. Tank Scan's dimensions+city question) — "Use my profile" if one exists, or a "save this as my default city" checkbox if not. Also editable any time from a "Profile" card in Settings. 100% local, no network call — see `CLAUDE.md` Principle 5 and the no-account rule above, which this must not violate.

## Out of scope

The cycling coach itself (Phase 2). Tutorials for individual features. Any marketing carousel before the stage picker — value first, explanation second.

## Acceptance criteria

1. From first launch, the stage picker appears immediately — no splash carousel, no sign-in.
2. Choosing "I already have a tank" reaches the camera in one more tap.
3. **A stopwatch from first launch to a created tank with at least one reminder reads under four minutes**, including taking the photo.
4. Choosing "something's wrong" reaches triage without creating a tank.
5. No screen anywhere in onboarding asks for an email address.
6. The camera permission prompt appears only when the camera is opened, with a plain-language explanation first.
7. Choosing Hinglish makes the whole onboarding appear in Hinglish.
8. Force-quitting mid-onboarding and reopening resumes sensibly rather than starting over.
9. Onboarding does not appear again on the next launch.
