# UI/UX Redesign — Execution Plan

**Source brief:** `docs/08-ui-redesign-brief.md` (Jaideep's consolidated redesign strategy, shared 2026-09-12 — read it before starting any section).
**Status:** Sections 0–2 complete (2026-09-12/13). Next: Section 3 (Navigation + My Tanks). Work the sections in order, one at a time — Jaideep says "do Section N".
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

## Section 0 — Inventory + per-screen audit — COMPLETE (2026-09-12)

**Goal:** Know exactly what each section will touch before starting it.
**Done:** All 31 user-facing screens audited — one focused pass per screen, from the TSX source (`dev/*` internal viewers excluded; per-screen CSS modules get checked when each section touches its screen). No code changed.
**Acceptance:** Met — every later section's screen list below is grounded in this audit, not rediscovered mid-build.

### Cross-cutting totals

**44 high / 77 medium / 37 low** across 31 files. By rule: hard-coded values 40, i18n gaps 28, spacing/radius 24, touch targets 23, cards/nesting 15, input visibility 8, aqua overuse 7, states 4, borders 4, typography 3, status-without-explanation 2.

Findings are directional (read from source, not a rendered screen) — each section verifies its screens on contact.

### Recurring patterns (these shape Sections 1–2)

1. **The segmented/unit toggle is re-implemented inline on at least five screens** (`tank/new`, `tank/[id]/size`, `tank/[id]/log`, `onboarding/scan`, `tank/[id]/edit` water-type) — each with its own `#fff` active text, ~2px vertical padding (sub-44px targets) and teal active fills. One shared SegmentedControl fixes all of them at once.
2. **Sub-44px touch targets concentrate in small inline buttons**: livestock row delete 28px, Dex checkmark 26px, community photo-remove 22px, comment actions text-only, back buttons 36px, count buttons 36px.
3. **i18n gaps**: `login/page.tsx` is entirely untranslated (7 high findings — every string on the screen); also JournalPanel, GalleryPanel, PostCard, admin, onboarding report's algae strings, and scattered `...` loading labels.
4. **Card-as-default-container** — `Card.tsx`'s own doc comment says "the default container for everything": journal rows, livestock rows, Dex rows, emergency intake groups, privacy paragraphs, Ask bubbles (Card inside a bubble).
5. **Raw native selects bypass `Field`** on edit, log, emergency, ask history, onboarding report — the input-visibility problem (R2).
6. **Status without explanation**: the My Tanks "Healthy" badge — the brief's exact example.
7. **Teal for non-primary things**: journal type labels, Edit Targets text action, Translate button, admin chart bars.

### Per-screen findings (top items; H/M/L as reported)

**My Tanks home**
- `(tabs)/page.tsx` H1 M3 L1, 3 hard-coded — "Healthy" badge without explanation (R5); empty state is a plain `<p>`, not `EmptyState`; hard-coded rgba on hero overlay and settings link. Keep: hero photo hierarchy.

**Tank Detail**
- `tank/[id]/page.tsx` H1 M2 L2 — 28px delete button in livestock inline rows (R12); `#fff` confirm buttons; count input under 44px; `Tank photo` literal. Keep: SpeciesThumb consistency.

**Gallery / Journal**
- `tank/[id]/gallery/page.tsx`, `tank/[id]/journal/page.tsx` — thin wrappers around panels; clean.
- `GalleryPanel.tsx` H2 M3 — `Adding...` / `+ Add photo` / error strings not through i18n; raw px margins.
- `JournalPanel.tsx` H3 M2, 11 hard-coded — search/save/type-label strings not through i18n; every entry wrapped in a Card; teal for type labels.

**Tank creation / editing**
- `tank/new/page.tsx` H2 M2 L1 — unit toggle: `#fff` text, sub-44px targets, teal active fill; water-type buttons teal fill.
- `tank/[id]/edit/page.tsx` H1 M3 L1 — remove buttons `4px 12px` padding; plants/equipment in Cards; raw selects.
- `tank/[id]/size/page.tsx` H2 M2 L1 — same unit-toggle pattern.
- `tank/[id]/log/page.tsx` H2 M4 L2 — TargetEditor raw inputs blend into the surface (R2); sub-44px inputs/button; per-parameter Cards; teal Edit Targets link. Keep: the liquid-test timer.

**Fish**
- `tank/[id]/livestock/page.tsx` H3 M2 L1 — LivestockRow raw px paddings/font sizes; Card per fish; small count button.
- `tank/[id]/livestock/search/page.tsx` H1 M2 L3 — 36px count buttons; bordered already-in-tank items; two wrong i18n namespace keys. Keep: the additive add flow.
- `tank/[id]/livestock/scan/page.tsx` M3 L2 — candidates in bordered boxes; raw px; `4px 12px` SecondaryButtons. Keep: CompatibilitySummary before adding.

**Onboarding**
- `onboarding/page.tsx` H1 M3 L1, 12 hard-coded — welcome hero hard-coded hex; FloatingField transparent input (R2); segmented toggle sub-44px. Keep: glassmorphism legibility over the photo.
- `onboarding/scan/page.tsx` H2 M3 L1 — unit toggle again; details Card.
- `onboarding/report/page.tsx` H2 M4 L1, 12 hard-coded — raw selects (R2); algae strings bypass i18n (R11); Cards around text lists; small remove-equipment button.
- `onboarding/planner/page.tsx` H1 M2 L2 — `5px 12px` SecondaryButtons sub-44px; raw px in species rows. Keep: curated beginner plants alongside AI suggestions.

**Species Dex**
- `(tabs)/dex/page.tsx` H1 M5 L2 — 26px checkmark/lock indicator; bordered rows; soft-token selects may blend; plain `<p>` empty state; category/difficulty values not i18n'd. Keep: the segmented mine/all tabs.
- `(tabs)/dex/[id]/page.tsx` H1 M1 L2 — 32px tank-picker buttons; `#fff` add buttons; pill radii on StatTiles. Keep: the StatTile care grid.

**Ask Aqua**
- `(tabs)/ask/page.tsx` H1 M4 L1, 11 hard-coded — Card-in-bubble nesting; raw px throughout bubbles; thumbs buttons emoji-only, likely sub-44px. Keep: the sticky composer via `footerAboveDock`.
- `(tabs)/ask/history/page.tsx` M3 — raw select; plain-div empty state.

**Emergency**
- `emergency/page.tsx` H1 M3 L1 — every intake group in a Card (R1); raw selects; `#fff` active symptom buttons; pill radii. Keep: the stage-based state machine.

**Community**
- `(tabs)/community/page.tsx` M1 L1 — loading state is a plain `<p>`.
- `community/[id]/page.tsx` H2 M2 L2 — comment actions text-only sub-44px; footer input bypasses Field.
- `community/new/page.tsx` H1 M1 L3 — 22px photo-remove button.
- `PostCard.tsx` H1 M2 L1 — Report/Delete/Translate/Like strings not through i18n; teal Translate button; 28px more-actions button. Keep: optimistic like updates.

**Auth**
- `login/page.tsx` H7 M4 — the entire screen is untranslated English (every string). Keep: the clean single-column layout.

**Misc**
- `about/page.tsx` H1 M2 — 36px back button; Cards around text blocks.
- `privacy/page.tsx` H1 M3 L1 — Card per paragraph; 36px back button.
- `admin/page.tsx` H1 M2 L2 — all labels untranslated (private dashboard — acceptable, noted); StatGrid nested in Card; teal chart bars.

### Component capabilities (as found)

- `Button` — primary/secondary/danger variants; **full-width by default**; min-height 44px; weight 700; radius-md. Primary fills with `--color-deep`, not aqua. Missing: text/tertiary tier, compact/non-full-width sizing.
- `Card` — surface + radius + hairline border; doc comment: "the default container for everything" — the R1 root cause.
- `Field` — label + input + error text; surface-alt fill + line border; focus swaps to deep border + surface bg; min-height 44px. Missing: select and textarea variants; fill-vs-surface contrast is the brief's R2 concern.
- `Chip` — neutral/fixNow/watch/improve/unverified/pro variants; display-only, not selectable.
- `Screen` — safe-area wrapper, background override, measured sticky footer, `footerAboveDock`.
- `TabBar` — 5 tabs, AquaIcon, collapse-near-bottom, i18n labels — the Discover/Profile renames are i18n string changes.
- `EmptyState` — icon + message + one primary action.
- **Missing primitives the brief requires:** ListRow, Status (icon + label + explanation), SegmentedControl, choice-card pattern, the TextInput focus system.

### What Sections 1–2 take from this

- **Section 1** sweeps the 40 hard-coded-value findings onto tokens after the rebase; severity colors stay a separate safety-critical scale.
- **Section 2** builds the missing primitives (SegmentedControl kills the five inline toggles; ListRow replaces the Card-per-row pattern; Status fixes the Healthy badge), converges Button (text tier, sizing) and Field (select/textarea, stronger fill), and enforces 44px targets.

## Section 1 — Design tokens (brief tasks 0.1–0.4) — COMPLETE (2026-09-12)

**Goal:** One visual system, defined once.
**Done:** `tokens.css`/`tokens.ts` rebased onto the brief's palette. Dark is now the default look (dark values on `:root`; light under `prefers-color-scheme: light` + `[data-theme="light"]`, so the Appearance setting keeps working). Dark carries the brief's exact values; light is derived (validated 2026-09-10/11 neutrals, accent family on the aqua hue, severity hues darkened for AA on white). Type scale → 32/28/20/16/14/12; spacing → 8-point (xxxl 48→40, nothing consumed it); radius → 12/16/20/pill (`Card` already read `--radius-lg`, so cards landed on 16px with zero component edits). New `--color-ink-faint` for muted text/placeholders. App-shell coherence: `layout.tsx` theme-color metas + `manifest.json` colours moved to the dark values. `docs/04-design-system.md` updated in the same pass.
**Verification:** `tsc` + `build` clean (lint fails only on 4 pre-existing `react-hooks/refs` errors in `tank/[id]/livestock/page.tsx`, untouched by this change). Real-browser pass with a throwaway account (created and deleted via the real self-serve flow): all tokens resolve to the brief's exact hexes on every key screen in dark; title 28px; primary button solid aqua at 12px radius; Appearance toggle lands the exact light values and returns to dark; light-OS context gets light. Screenshots reviewed — no breakage (My Tanks zero-state sparseness is pre-existing layout; Section 3 rebuilds that screen).
**Acceptance:** Met — every screen works in both themes; dark shows the brief's exact values. The "no screen invents its own values" half is Section 2+'s work: the audit's 40 hard-coded-value findings get swept as each section touches its screens.

## Section 2 — Shared components (brief tasks 0.5–0.10) — COMPLETE (2026-09-13)

**Goal:** No screen invents primitives.
**Done:** `Button` converged into a three-tier system: primary (solid aqua) / secondary / new `TextButton` (tertiary, text-only, aqua) — plus a `fullWidth` prop (default `true`, matching every existing call site) so a button can be sized to its importance instead of always stretching edge-to-edge, per the brief's "not every action should be a giant pill." `Field` gained `SelectField` and `TextAreaField` siblings, same visual language (surface-alt fill, visible border, aqua focus ring) as the existing text `Field` — this is the fix for the audit's R2 finding (raw native `<select>`s bypassing the input system on edit/log/emergency/ask-history/onboarding-report). Four new primitives: `ListRow` (icon + label + secondary metadata + optional chevron, ≥52px row height, replaces the "Card wrapped around every row" pattern), `Status` (icon + label + a **required** explanation string — directly fixes the brief's own named example, "Never have '● Healthy' with no explanation"), `SegmentedControl` (replaces the five inline-reimplemented toggle patterns found in Section 0's audit — cm/ft, water-type, method selectors — with one component using solid-aqua-fill for the active segment and a real ≥44px tap target per segment), `ChoiceCard` (selectable card: aqua border + aqua-tint background + checkmark when selected, ≥44px tap target). All six demoed live in the `/dev/components` gallery (every existing shared component's demo page, not linked from app nav) and piloted for real on Settings — the language and Appearance toggles, previously hand-rolled `<button>` rows with a hardcoded `color: "#fff"` for the active state, are now `SegmentedControl`.
**A real bug found and fixed during verification, not just built-and-assumed-correct:** `Status`'s dot and label originally shared the same variant CSS classes (e.g. `.improve` setting both `color` and `background-color`) — applied to the label `<span>`, that painted a solid colour block *behind* the label text in the same colour as the text itself, rendering the label invisible. Caught by actually looking at a real screenshot in the browser (not just trusting the code), not a static-analysis catch. Fixed by splitting into separate `.dotX`/`.labelX` class sets. Also fixed a second, pre-existing (not Section-2-introduced) bug the same verification pass surfaced: `/dev/components`' own light/dark preview toggle set `data-theme` on an inner `<div>`, but the token system's light override is scoped to `:root[data-theme="light"]` (set on `<html>` by the real `ThemeProvider`) — the preview toggle's "Light" button had never actually worked. Fixed to set the attribute on `document.documentElement` via `useEffect`, matching how the real app does it.
**Verification:** `npx tsc --noEmit` and `npm run build` clean; `npm run lint` unchanged (only the 4 pre-existing `react-hooks/refs` errors in `tank/[id]/livestock/page.tsx`, untouched). Real-browser pass on a local dev server, both themes, screenshots reviewed for all six new primitives plus the updated Button/Field/Settings — no other regressions found.
**Not done, correctly deferred to later sections:** screens are not migrated onto the new primitives yet beyond the Settings pilot — that's each later section's own job as it touches its screens (Section 2's acceptance bar is "primitives exist and are provably usable," not "the whole app uses them").
**Acceptance:** Met.

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
