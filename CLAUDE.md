# CLAUDE.md — AquaAI

Read this file at the start of every session. It is the project constitution. If anything you are about to do conflicts with it, stop and say so instead of proceeding.

---

## What we are building

A mobile-first **web app** (works on any phone browser, installable as a PWA; desktop works too but is not the design target) that takes a person from "I think I want fish" to a thriving planted tank. Freshwater and planted only. Not reef, not marine.

The wedge is **Tank Scan**: one photo of a tank plus two questions returns a structured Tank Report — detected livestock, plants, algae, equipment, and a ranked action list. It doubles as onboarding, so a new user sets up their tank by taking a photo instead of filling a form.

Working title is AquaAI. The name is not final. Do not hard-code it in more places than necessary; keep it in one constants file.

Full reasoning lives in `docs/00-product-plan.md`. Read it once before your first substantial task.

---

## Who you are working with

**Jaideep is not a programmer.** This changes how you work:

- Never assume he can debug a stack trace, read a diff, or judge whether an approach is sound. Explain in plain language what you did and what he should check.
- Every task ends with **acceptance criteria he can verify by using the app**, not by reading code. "Open the app, create a tank, force-quit, reopen — the tank is still there."
- When you hit a genuine fork (two reasonable approaches with different tradeoffs), stop and ask in plain language with the consequences spelled out. Do not silently pick and move on.
- When something is broken, say plainly what is broken and what you need from him. Do not bury it in a summary.
- Never tell him to "just" do anything. If a step needs a terminal command, give the exact command to paste.

---

## The six product principles

These are hard rules, each earned from a competitor's one-star reviews. A feature that violates one of these is wrong even if it is well built.

1. **Advise, never block.** The app always records reality. If a user has an angelfish in a 190L tank with neons, log it, then explain the risk and offer the fix. Warnings are dismissible and remembered. Never refuse to save something because it violates a care rule.
2. **Never paywall knowledge or safety.** Species care data, disease reference, emergency triage and compatibility warnings are free forever. We sell compute and continuity, not facts.
3. **Never say "not found."** If a species is not in the database, generate a provisional card, mark it `verified: false`, let the user save and use it immediately, queue it for review.
4. **Their data is theirs.** Full CSV + JSON + photo export on the free tier, tied to their account. This ships early (T-012), not "later." (The "no account required" half of this principle was retired 2026-09-10 — see Principle 5's note.)
5. **~~Works at the tank, offline.~~ Superseded 2026-09-10 — accounts are now required.** Jaideep: "I want to launch it to real users... a backend to store everything." Real user accounts (Google sign-in, or phone number + a self-chosen 4-digit PIN) now exist, and every route requires sign-in (`src/proxy.ts`). Core data (tanks, livestock, measurements, profile) is stored server-side in Postgres, scoped per account, specifically so it follows a user across devices — the opposite of the old "SQLite is the source of truth, network is an enhancement" rule. The remaining local-only tables (plants, equipment, journal, photos, species/Dex progress) are mid-migration to the same pattern; until that's done, those specific screens still depend on local SQLite-WASM/OPFS and won't yet follow a user to a new device. See `specs/PROGRESS.md`'s 2026-09-10 "accounts + backend" entry for the full decision record and what's still local vs. server-backed as of any given date.
6. **Calm, not addictive.** This is a pet-care app. No streak anxiety, no rewards for collection size, no guilt notifications. Notifications are only for things with real deadlines.

---

## Stack — do not deviate without asking

Pivoted from native (Expo/React Native) to web on 2026-08-31. Verified current as of that date. Details and sources in `docs/01-architecture.md`.

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), React 19 |
| Language | TypeScript, strict mode |
| Rendering | PWA — installable, mobile-first responsive layout |
| Local database | SQLite compiled to WASM (`wa-sqlite` or `sql.js`) + Drizzle ORM, persisted via OPFS — still used for tables not yet migrated server-side (see Principle 5's note) |
| Server database | Postgres via Neon + Drizzle ORM, added 2026-09-10 for real accounts — `src/server/db/*` |
| Auth | Auth.js (NextAuth v5) — Google OAuth + a phone-number/4-digit-PIN Credentials provider, JWT sessions, added 2026-09-10 — `src/auth.ts`, `src/proxy.ts` |
| UI state | Zustand |
| Network state | TanStack Query — **for AI/network calls only** |
| Camera | Native `<input type="file" accept="image/*" capture="environment">` |
| Notifications | None — Web Push/reminders was built (T-018) then removed 2026-09-10, see "Reminders" below |
| Payments | Stripe Checkout + Customer Portal |
| Build/release | Vercel (or equivalent) — deploy on push, no store review |
| AI | Provider-agnostic adapter, default Gemini 3.5 Flash-Lite, called from Next.js API routes |

### Stack rules that are easy to get wrong

- **SQLite (via WASM) is still the source of truth for tables not yet migrated server-side** (see Principle 5's note) — for `tanks`/`livestock`/`livestockEvents`/`measurements`/`profile`, Postgres is now the source of truth instead. Zustand is UI state. TanStack Query wraps network calls only. Do not cache local SQLite data in TanStack Query — Drizzle live queries already give reactive re-rendering, and layering a cache creates two sources of truth that drift.
- **The phone+PIN sign-in has no SMS verification, by Jaideep's explicit choice** (to avoid SMS provider cost) — a phone number is never confirmed to belong to whoever typed it, and a 4-digit PIN is only a 10,000-combination keyspace. `src/server/auth/login-rate-limit.ts` locks a phone number out after 5 wrong PINs in 15 minutes as the one mitigation that's genuinely code's to add. There is no forgot-PIN recovery flow. Do not "fix" this by quietly adding SMS OTP — that reverses a deliberate, costed decision; ask first.
- **OPFS requires a secure context (HTTPS) and is not available in every browser** (notably not in regular Safari tabs outside a worker in some versions) — verify current support before building on it, and design a graceful "your browser can't store data locally" fallback message rather than a silent failure.
- **Never put an AI API key in client-side code or a bundle.** All model calls go through Next.js API routes (server-side) acting as the proxy. The only exception is the user's own key in bring-your-own-key mode, which lives in the browser's `IndexedDB`/`localStorage` is NOT acceptable for a secret — use it only in-memory per session, or accept the tradeoff explicitly with the user.
- Test on real phone browsers (Chrome on Android, Safari on iOS), not just desktop dev tools' device emulation — camera capture, OPFS, and Push behave differently on-device.

---

## AI rules

The full contracts are in `docs/03-ai-contracts.md`. The rules that matter most:

- **Every AI response is structured JSON against a declared schema, never free prose.** The app renders it as cards and buttons. Prose is the worst interface for advice someone is meant to act on.
- **Every claim cites the corpus entry or species card it came from.** An answer with no citation is a bug.
- **Retrieval first, generation second.** The model answers from the corpus entries in `content/corpus/` and from `data/species.seed.json`, not from its own knowledge.
- **No improvisation on safety-critical questions.** If retrieval returns nothing for a question about treating a sick/injured fish — medication, dosing, or disease diagnosis — the answer is "I don't have grounded guidance on this yet" — never a guess. (Narrowed 2026-09-11: a plain species care fact like a temperature or pH range is not in this bucket — see the note below.) Everything else may be answered from general knowledge, flagged as not corpus-grounded.
- **A species care fact (temperature/pH/tank size/diet/etc.) with no number in our own catalog is not the same risk as a medication dose.** Answer it from general knowledge, with a real number/range where one is known, flagged `uncovered: true` so the app shows it as general knowledge rather than this app's own verified data — a refusal here is a worse product than a clearly-labelled general answer. Reserve the hard refusal above for medication/dosing/disease. (`ask/v3`, 2026-09-11 — Jaideep hit the old, broader refusal on "ideal temperature for pea puffers" and called it out directly.)
- **Ids are exact.** Species ids are common-name kebab-case slugs (`neon-tetra`, `amano-shrimp`) — never scientific-name slugs. Corpus ids are the filenames in `content/corpus/`. A citation that does not resolve is a build error.
- **Confidence gating.** Below threshold, ask a question instead of asserting. "Is the white patch fuzzy or grain-like?" is better product and better medicine than a confident guess.
- **Never output a medication dose without confirmed tank volume and confirmed inhabitants.** Ask first, every time.
- **Always recommend testing water before treating.** Most "disease" in beginner tanks is water quality.
- **Downscale images to ~1024px longest edge before upload.** A 12MP photo costs enormously more and is no more accurate.
- **Log token counts on every call** so unit economics are measured, not guessed.

### The one that has already nearly been missed

If a tank's pH has drifted below 7 with accumulated ammonia, that ammonia is sitting in its relatively harmless ionised form. A water change with higher-pH tap water converts it to the toxic form within minutes and kills fish that were surviving. **"Do a large water change" is the app's most likely default advice and in this specific case it is lethal.**

Two stages, and these exact thresholds are used in every document — do not paraphrase them:

- **pH < 7.0 and total ammonia ≥ 0.5 ppm** → several small changes (20–25%) with pH-matched water, never one large one, with the reason explained.
- **pH < 7.0 and total ammonia ≥ 5 ppm** → escalate: moving the fish to already-cycled, parameter-matched water is safer than changing water in place.

Written up as `corpus:ph-ammonia-trap`. See `docs/05-content-guide.md`.

---

## Reminders — removed 2026-09-10

The Reminders feature (T-018: per-tank task scheduling, quick-task presets, Web Push notifications, the cross-tank Home calendar) was built, then removed entirely at Jaideep's explicit direction ("remove the reminders functionality from everywhere. Its useless"). This section is kept as a historical record — **do not rebuild this without Jaideep asking again.** If reminders come back, treat it as a fresh feature decision, not a restoration of the below.

The tables (`tasks`, `push_subscriptions`, `push_sends`), API routes (`/api/push/*`), server push helpers, `RemindersPanel`, `FloatingAskButton`'s sibling reminder UI, the `/home` cross-tank calendar route, the Vercel cron job, and the service worker's `push`/`notificationclick` handlers are all gone. `src/lib/schedule.ts` still exists but only for its date-formatting helpers (`localDateInputToIso`/`isoToLocalDateInput`), reused by unrelated date fields (tank setup date, gallery grouping) — not for anything reminders-related.

The original design notes, preserved for context only:

- Reminders required installing the PWA and granting notification permission; iOS Safari only supported Web Push for installed PWAs, from iOS 16.4+.
- Push subscriptions were stored per device in the backend (VAPID keys, a send endpoint, a daily Vercel Cron sweep).
- A "send a test reminder" diagnostics flow existed in Settings.

---

## How to work

1. **One task at a time, from `specs/`.** Jaideep will say "do T-011." Read that spec, read its dependencies, then work. Do not silently expand scope into neighbouring tasks.
2. **Read before you write.** Check whether the thing already exists before creating it.
3. **Small commits with plain-language messages.** "Add tank creation form and save to local database", not "feat(tanks): impl CRUD".
4. **Finish by stating the acceptance criteria and how you verified them.** If you could not verify something yourself (anything needing a physical phone, a camera, or a store account), say so explicitly and tell Jaideep exactly what to tap to check it.
5. **Update `specs/PROGRESS.md`** when a task is done.
6. **When you learn something that contradicts these docs** — a package that does not work, an API that changed — update the doc in the same session and say you did.

## Conventions

- Files: `kebab-case.ts`. Components: `PascalCase.tsx`. Hooks: `use-thing.ts`.
- Routes live in `app/`, everything else in `src/`.
- Colours, spacing and type come from `src/theme/tokens.ts` only. No hard-coded hex values in components. See `docs/04-design-system.md`.
- All user-facing strings go through the i18n layer from day one — retrofitting Hinglish later is far more expensive than doing it now.
- Dates stored as ISO 8601 UTC strings. Displayed in device local time.
- Units stored in metric (litres, cm, °C) always. Converted at the display layer only.

## Do not build these yet

Community, marketplace or trading, native app store submission (Android/iOS), reef/marine support, breeding logs, shop directory. Each is a real support or compliance burden and every one of them is Phase 2 or later. If a task seems to need one of these, stop and ask.

("Accounts and cloud sync" was on this list until 2026-09-10, when Jaideep asked for exactly that to launch to real users — see Principle 5's note above. Do not re-add it here without him asking again.)
