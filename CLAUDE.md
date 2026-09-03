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
4. **Their data is theirs.** Full CSV + JSON + photo export on the free tier, no account required. This ships early (T-012), not "later."
5. **Works at the tank, offline.** SQLite is the source of truth. Network is an enhancement, never a dependency. Every screen must render with the network off.
6. **Calm, not addictive.** This is a pet-care app. No streak anxiety, no rewards for collection size, no guilt notifications. Notifications are only for things with real deadlines.

---

## Stack — do not deviate without asking

Pivoted from native (Expo/React Native) to web on 2026-08-31. Verified current as of that date. Details and sources in `docs/01-architecture.md`.

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), React 19 |
| Language | TypeScript, strict mode |
| Rendering | PWA — installable, mobile-first responsive layout |
| Local database | SQLite compiled to WASM (`wa-sqlite` or `sql.js`) + Drizzle ORM, persisted via OPFS |
| UI state | Zustand |
| Network state | TanStack Query — **for AI/network calls only** |
| Camera | Native `<input type="file" accept="image/*" capture="environment">` |
| Notifications | Web Push (`web-push` + a service worker), requires a small backend |
| Payments | Stripe Checkout + Customer Portal |
| Build/release | Vercel (or equivalent) — deploy on push, no store review |
| AI | Provider-agnostic adapter, default Gemini 3.5 Flash-Lite, called from Next.js API routes |

### Stack rules that are easy to get wrong

- **SQLite (via WASM) is still the source of truth**, now persisted to OPFS (Origin Private File System) instead of the phone's filesystem. Zustand is UI state. TanStack Query wraps network calls only. Do not cache local SQLite data in TanStack Query — Drizzle live queries already give reactive re-rendering, and layering a cache creates two sources of truth that drift.
- **OPFS requires a secure context (HTTPS) and is not available in every browser** (notably not in regular Safari tabs outside a worker in some versions) — verify current support before building on it, and design a graceful "your browser can't store data locally" fallback message rather than a silent failure.
- **Never put an AI API key in client-side code or a bundle.** All model calls go through Next.js API routes (server-side) acting as the proxy. The only exception is the user's own key in bring-your-own-key mode, which lives in the browser's `IndexedDB`/`localStorage` is NOT acceptable for a secret — use it only in-memory per session, or accept the tradeoff explicitly with the user.
- **Web Push needs a backend component and VAPID keys.** It does not work at all when the site is not installed/permitted, and iOS Safari only supports it for installed (Add to Home Screen) PWAs, and only from a fairly recent iOS version — verify against current iOS support before promising reminders will work on iPhone.
- Test on real phone browsers (Chrome on Android, Safari on iOS), not just desktop dev tools' device emulation — camera capture, OPFS, and Push behave differently on-device.

---

## AI rules

The full contracts are in `docs/03-ai-contracts.md`. The rules that matter most:

- **Every AI response is structured JSON against a declared schema, never free prose.** The app renders it as cards and buttons. Prose is the worst interface for advice someone is meant to act on.
- **Every claim cites the corpus entry or species card it came from.** An answer with no citation is a bug.
- **Retrieval first, generation second.** The model answers from the corpus entries in `content/corpus/` and from `data/species.seed.json`, not from its own knowledge.
- **No improvisation on safety-critical questions.** If retrieval returns nothing for a question touching medication, dosing, disease or a specific care parameter, the answer is "I don't have grounded guidance on this yet" — never a guess. Non-safety-critical general questions may be answered from general knowledge, flagged as not corpus-grounded.
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

## Reminders — treat as a genuine risk, just a different one

Web Push replaces local OS notifications. It needs a small backend (VAPID keys, subscription storage, a send endpoint) and the app must be installed (Add to Home Screen) for reliable delivery on iOS.

- **Reminders require the user to install the PWA and grant notification permission.** Build a clear, honest in-app prompt explaining why ("so we can remind you when the water change is due"), and keep the in-app task list fully useful for anyone who declines or hasn't installed.
- **iOS Safari only supports Web Push for installed PWAs**, and only from iOS 16.4+. Verify current support before launch and be explicit in-app about which platforms support push today.
- Store push subscriptions per device in the backend; a user with the app installed on two phones has two subscriptions.
- **Build an in-app "Are my reminders working?" diagnostics screen** — permission state, subscription registered, a "send a test reminder in 60 seconds" button. Same reasoning as the native plan: a reminder that silently never arrives is worse than no reminders feature.
- Test on a **real installed PWA on both an Android phone and an iPhone**, not just desktop Chrome — push behaviour differs meaningfully by platform.

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

Community, marketplace or trading, accounts and cloud sync, native app store submission (Android/iOS), reef/marine support, breeding logs, shop directory. Each is a real support or compliance burden and every one of them is Phase 2 or later. If a task seems to need one of these, stop and ask.
