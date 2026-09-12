# UI/UX Redesign — Execution Plan

**Source brief:** `docs/08-ui-redesign-brief.md` (Jaideep's consolidated redesign strategy, shared 2026-09-12 — read it before starting any section).
**Status:** Not started. Work the sections in order, one at a time — Jaideep says "do Section N".
**Log every completed section in `specs/PROGRESS.md`**, same as any task.

---

## Settled decisions (2026-09-12, Jaideep)

1. **Themes: both, dark default.** The brief's dark palette becomes the app's default look; a matching light mode is derived from it so the existing Appearance setting (light/dark/system) keeps working. Nothing shipped is removed.
2. **Nav label: "My Tanks" stays.** The brief proposed renaming the tab to "Tanks"; Jaideep's 2026-09-10 wording wins. The other renames (Dex → Discover, My Profile → Profile) proceed as the brief specifies.
3. **Localization: readiness only.** Layouts flex for longer text, and locale-aware dates and units ship in this redesign; adding actual new languages (German, Arabic/RTL, Thai, Japanese) is a separate future task, not part of this work.

## Working rules (every section)

1. One section at a time. Each ends with: `npm run lint` + `npx tsc --noEmit` + `npm run build` clean, verified in a real browser, committed, pushed, deployed (`npx vercel deploy --prod --yes`), and logged in `specs/PROGRESS.md`.
2. Every changed user-facing string goes through the i18n layer, in English **and** Hinglish.
3. Colors, spacing, radii and type sizes come from `src/theme/tokens.css` / `tokens.ts` only. No hard-coded values in screens.
4. Functionality is frozen: no new features, nothing removed, except where the brief explicitly changes the experience. Data model, AI behavior and accounts are untouched.
5. Renames that reverse earlier logged decisions get a decisions-log entry in `specs/PROGRESS.md`.

## Starting facts (inventory, 2026-09-12)

- Token system exists and is healthy: `src/theme/tokens.css` (light on `:root`, dark under `prefers-color-scheme` + `[data-theme]`) mirrored by `tokens.ts`. Severity colors are a separate safety-critical scale — the brief's healthy/warning/danger values map onto them, they do not replace them.
- Shared components already exist to converge rather than invent: `Button`, `Card`, `Chip`, `Field`, `EmptyState`, `Screen`, `TabBar`, `AquaIcon`, `SpeciesThumb`, `PostCard`, `LottiePlayer`.
- ~50 inline hard-coded colors in `.tsx` screens (mostly `color: "#fff"` on colored chips; real offenders include the Dex share-card canvas in `dex/[id]/page.tsx` and the onboarding welcome background). CSS modules have their own set — audit during Section 0.
- i18n is wired app-wide (`en` + `hi-latn`); every rename needs both files touched.
- 433 of 445 species already have real reference photos (`public/species/`).

---

## Section 0 — Inventory + per-screen audit

**Goal:** Know exactly what each section will touch before starting it.
**Do:** Full audit of every screen against the brief's Part 1 rules (cards-vs-dividers, input visibility, border count, aqua overuse, hard-coded values). Produce a per-screen findings list appended to this file. Confirm what `Button`/`Card`/`Field`/`Chip` already support so Section 2 converges them instead of rebuilding.
**Do not:** Change any code.
**Acceptance:** Every later section's "changes" list is grounded in this audit, not rediscovered mid-build.

## Section 1 — Design tokens (brief tasks 0.1–0.4)

**Goal:** One visual system, defined once.
**Do:** Rebase `tokens.css`/`tokens.ts` onto the brief's palette — dark mode gets the brief's exact values and becomes the default; derive the matching light mode. Add the type scale (32/28/20/16/14/12), the 8-point spacing scale (4/8/12/16/24/32/40), and the radius system (12/16/20/pill) as tokens. Apply the semantic discipline: aqua = primary action, active nav, selection, links, identity; green = health, amber = warning, coral = danger. Keep the system font stack (SF Pro/Roboto via CSS defaults) — it satisfies the brief's "one legible sans-serif" without bundling a webfont; ask before adding Inter. Update `docs/04-design-system.md` in the same pass.
**Watch:** This recolors every screen at once — intended. Full-app sweep for breakage before committing.
**Acceptance:** Every screen still works in both themes; dark shows the brief's exact values; no screen invents its own values (spot-check the audit list).

## Section 2 — Shared components (brief tasks 0.5–0.10)

**Goal:** No screen invents primitives.
**Do:** Converge `Button` into the three-tier system (primary aqua fill / secondary surface / text), sized by importance. Rebuild the input look (`Field`) with the brief's default and focus states — the accessibility fix. New `ListRow` (icon + label + secondary metadata + chevron) and `Status` (icon + label + explanation) components. Standardize tabs/segmented controls and choice cards (selected = aqua border + tint + checkmark). Minimum 44px touch targets on all icon controls.
**Do not:** Migrate every screen yet — components land first, screens adopt them in their own sections.
**Acceptance:** Primitives exist and are used on at least one pilot screen each (Settings is a good pilot); the audit's worst offenders can be expressed without new CSS.

## Section 3 — Navigation + My Tanks (brief Phase 1)

**Goal:** Tanks is unmistakably home; the tank is the hero.
**Do:** Tab bar becomes My Tanks | Discover | Ask Aqua | Community | Profile (labels via i18n; "My Tanks" per decision 2). My Tanks redesigned: small greeting, tank photo dominating each card, name + `54.9 L · Freshwater · Planted`, status with explanation, `4 fish · 27–28°C`, no controls inside the card. Emergency demoted to a quiet "Need help? → Get help" row — the urgent treatment stays inside the flow itself. Action row: Add tank / Help me build a tank / Ask Aqua. Zero-tanks state matches.
**Acceptance:** A first-time user immediately understands My Tanks is the primary destination; the photo dominates; emergency no longer shouts.

## Section 4 — Tank Detail (brief Phase 2)

**Goal:** The most important screen in the product answers "how is my aquarium doing?"
**Do:** New structure per the brief: name + water type, status with explanation + View details, large photo, volume and temperature as primary metrics with dimensions as a smaller line, Water section with parameter rows and check marks, Fish/Photos/Journal as list rows with counts, "Check tank health" as the primary action. Accordions become rows; created date de-emphasized. Status explanations computed from latest parameters + thresholds — display only, no schema change.
**Acceptance:** The screen communicates aquarium health before database content.

## Section 5 — Onboarding + tank creation + units (brief Phase 3)

**Goal:** A new user reaches a real tank with minimal friction.
**Do:** Onboarding becomes Welcome → name → "Show us your aquarium" (photo-first, reusing the existing scan flow) → minimal tank setup (name, dimensions, water type). Language and theme stay in Settings only. Planner gets restyled choice cards, a plain "Continue" CTA, "1 of 3" step indicator, and "Not sure?" beginner help. Add Tank gets the new inputs, a cleaner dimensions control, auto-computed volume shown as `54.9 L · 14.5 gal`, city moved into "More details", photo optional. Units (cm/in, L/gal, °C/°F) work at the display layer app-wide with a Settings preference — stored metric always (CLAUDE.md rule).
**Note:** This supersedes the 2026-09-04 profile-first onboarding — decisions-log entry required.
**Acceptance:** A new user creates a tank with minimal friction; switching units changes displays everywhere.

## Section 6 — Discover (brief Phase 4)

**Goal:** An aquarium encyclopedia, not a game.
**Do:** Rename Dex → Discover and My Fish → My Species (both languages; decisions-log entry for the Dex rename). My species / Explore tabs, search, category chips (Fish/Shrimp/Snails/Plants). Species rows: real photo, name, `Fish · Beginner`, calm "✓ Added" state; padlocks and the "4 of 1484 unlocked" framing go. The ~12 species without photos keep the emoji fallback — sourcing those is separate content work, not this redesign.
**Acceptance:** Discover reads as a premium encyclopedia; no gamified framing.

## Section 7 — Ask Aqua (brief Phase 5)

**Goal:** A specialist that knows your tank, not a generic chatbot.
**Do:** Empty state becomes "Your aquarium expert" with the user's actual tank line (`2ft planted tank · 54.9 L · 27–28°C`). Suggestions become lightweight chips. Composer cleaned; Early Bird promo moves to Profile → Plan (or a dismissible announcement — pick with Jaideep if it matters).
**Acceptance:** The first screenful communicates "I know your aquarium" before "ask me anything".

## Section 8 — Community (brief Phase 6)

**Goal:** A living feed that scans quickly.
**Do:** Compact feed — dividers between posts, subtle surfaces only for image posts, less internal padding. Like/comment affordances more visible. "Translated from Marathi · Show original" pattern. FAB for New Post (the one place a FAB is justified).
**Acceptance:** The feed shows more posts per screen and social actions are obvious.

## Section 9 — Profile + Settings (brief Phase 7)

**Goal:** A conventional, scannable settings architecture.
**Do:** Profile becomes the person: avatar, name, Edit profile link, Preferences (Language ›, Appearance ›), Plan, Account (Export data, Sign out), Danger zone (Delete account with confirmation). Editable fields move into an Edit profile screen. Settings goes list-based; oversized controls become rows.
**Acceptance:** Scannable at a glance; destructive actions clearly separated and confirmed.

## Section 10 — Final polish (brief Phase 8)

**Goal:** Earn the scorecard targets — a real audit, not a rubber stamp.
**Do:** Contrast audit (secondary text, inputs, destructive, muted labels), touch targets, meaning never carried by color alone (✓/! icons), text scaling at larger accessibility sizes, Hinglish fit (no truncation), empty/error/loading states, micro-interactions, image treatment. RTL/text-expansion readiness per decision 3: layouts must not break under longer strings; full RTL ships only when an RTL locale does.
**Acceptance:** Every audit finding is either fixed or logged with a reason.
