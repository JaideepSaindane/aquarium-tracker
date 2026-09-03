# 04 — Design system

One purpose: every screen should look like it came from the same app, without Jaideep having to judge visual decisions one screen at a time. Claude Code reads the tokens here and uses nothing else.

**Hard rule: no hard-coded colours, spacing or font sizes in components.** Everything comes from `src/theme/tokens.ts`. If a value is needed that is not here, add it here first.

---

## The feel we are aiming for

Calm, legible, and slightly clinical — closer to a good field notebook than to a game. The app is often opened by someone worried about a dying fish, or standing at a tank with wet hands in bad light. That argues for high contrast, large touch targets, and no decorative noise.

Two things it must not look like: a children's game (undermines the care advice) or a laboratory dashboard (intimidates beginners, who are the primary audience).

Colour carries meaning, not decoration. The severity scale is the most important colour in the app and nothing else is allowed to compete with it.

**Surface treatment (2026-09-02): sleek, bold, matte, with glass used sparingly.** Static content — cards, banners, list rows, the species grid — stays flat and matte: a soft, low-opacity shadow for lift (`--shadow-sm`/`--shadow-md`, never a glossy highlight or gradient), a slightly bolder corner radius than before (`--radius-lg` = 20px on cards, up from 14px), and bolder type weight on buttons and headings. **Glass — a translucent, blurred background via `--glass-bg`/`--glass-border`/`--glass-blur` — is reserved for surfaces that genuinely float over content**: the bottom tab bar, the floating Ask AquaAI button, the Dex-unlock toast, and the survival-prompt card. Nothing that sits flat in the normal document flow gets glass; that keeps it a deliberate accent instead of a gimmick applied everywhere. See the new tokens in `src/theme/tokens.css`/`tokens.ts` (`shadow`, `glass`, and the bumped `radius` scale) — component CSS reads from these, never a hard-coded blur/shadow value.

---

## Colour tokens

**Rebased 2026-09-02** onto a tonal navy→sky blue system, per a design brief Jaideep shared (`aquarium-tracker-design-brief.md`) — replaces the app's earlier teal/burnt-orange identity everywhere. One hue family varying only in depth/lightness (navy → steel → sky), not a flat two-stop gradient. Severity keeps its own separate semantic scale, untouched by this change — those colours are safety-critical and never doubled as brand colour.

```ts
// src/theme/tokens.ts

export const light = {
  ground:      '#F3F8FD',  // app background — near-white with a whisper of blue
  surface:     '#FFFFFF',  // cards
  surfaceAlt:  '#EAF2FB',  // table headers, inset areas
  ink:         '#021024',  // primary text — near-black navy, never pure black
  inkMuted:    '#3C6A93',  // secondary text — darker than the brief's steel blue for AA contrast on white
  line:        '#C7DCED',  // borders
  lineSoft:    '#DCEBF7',  // internal dividers

  accent:      '#5483B3',  // steel blue — secondary actions, active states
  accentSoft:  '#E4EDF6',
  deep:        '#052659',  // deep navy — primary buttons, headlines, key UI
  deepSoft:    '#C1E8FF',  // pale sky — highlight fills, positive-state chips
}

export const dark = {
  ground:      '#021024',  // near-black navy
  surface:     '#0A1D3A',
  surfaceAlt:  '#0E2749',
  ink:         '#E7F3FF',  // pale sky as text, per the brief's dark-mode direction
  inkMuted:    '#8FB4D6',
  line:        '#173A63',
  lineSoft:    '#102C50',

  accent:      '#7DA0CA',  // light blue-grey — brighter than deep so it still pops on near-black
  accentSoft:  '#0E2749',
  deep:        '#5483B3',  // steel blue does primary-button duty in dark mode
  deepSoft:    '#123458',
}

// Severity — the only colours allowed to signal state.
// Deliberately separate from `accent` so an action never reads as an alarm.
export const severity = {
  fixNow:  { light: '#A93520', dark: '#E0725C' },   // fish are being harmed
  watch:   { light: '#9C6E0C', dark: '#D6A63C' },   // will cause problems
  improve: { light: '#2C7A52', dark: '#5FBE8A' },   // better, no urgency
  neutral: { light: '#57696B', dark: '#94A8A9' },
}
```

Shadows are deliberately *colored* navy (`rgba(5, 38, 89, …)`) rather than neutral grey — soft and low-opacity, never a flat drop shadow. Glass surfaces (`--glass-bg`/`--glass-border`, used only where something genuinely floats over content — see "Surface treatment" above) carry a faint navy tint too, so they read as "blue glass" rather than generic frosted white.

**Dark mode is not optional.** People check tanks at night with the room light off. Build both from day one; retrofitting is far more expensive.

Accessibility: body text meets WCAG AA against its surface in both themes. Severity is never signalled by colour alone — every severity indicator carries an icon and a text label, because red/green colour blindness affects roughly 8% of men and this app's whole job is communicating problems.

---

## Type

System fonts. No custom font files: they add bundle size and load risk for no benefit in an app that is read, not admired.

```ts
export const type = {
  display:  { size: 30, weight: '700', lineHeight: 34, letterSpacing: -0.5 },
  title:    { size: 22, weight: '700', lineHeight: 27, letterSpacing: -0.3 },
  heading:  { size: 17, weight: '600', lineHeight: 22 },
  body:     { size: 16, weight: '400', lineHeight: 24 },
  bodySm:   { size: 14, weight: '400', lineHeight: 20 },
  label:    { size: 12, weight: '600', lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  data:     { size: 16, weight: '600', fontVariant: ['tabular-nums'] },  // measurements
  caption:  { size: 12, weight: '400', lineHeight: 16 },
}
```

**Body text is 16px minimum.** Not 14. The app is used at arm's length in poor light.

**All numbers use `tabular-nums`.** Parameter values in a list must align vertically; without this, a column of pH readings looks broken.

**Respect the device font-size setting.** Do not disable font scaling. Test at the largest accessibility size — this is a common source of app-store accessibility complaints and it is free to get right.

---

## Spacing and shape

```ts
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 }
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 }
export const hitSlop = 8   // minimum touch target 44x44 including slop

// Matte elevation — soft, low-opacity, no gloss. Light/dark variants in tokens.css.
export const shadow = { sm: '…', md: '…', lift: '…' }

// Glass — only for surfaces that float over content (bottom nav, floating
// buttons, toasts/prompts). Everything else stays flat matte.
export const glass = { light: { bg: '…', border: '…' }, dark: { bg: '…', border: '…' }, blur: '20px' }
```

Layout uses flex `gap`, not per-element margins. Screen padding is `space.lg` horizontally.

---

## Components to build once

Every new screen should be assembled from these, not from raw `View`s. The "Built in" column says which task creates each one — the T-010 set is the foundation and must exist before any feature screen.

| Component | Built in | Notes |
|---|---|---|
| `Screen` | T-010 | Safe-area wrapper, background, scroll behaviour, standard padding |
| `Card` | T-010 | Surface, radius `md`, hairline border. The default container |
| `SeverityCard` | T-010 | Card with a left severity stripe, icon and label. The Tank Report's unit |
| `Chip` | T-010 | Small status pill. Severity, verified/unverified, free/pro |
| `EmptyState` | T-010 | Illustration, one line of explanation, one action |
| `Field` | T-010 | Labelled input with error text below |
| `PrimaryButton` / `SecondaryButton` / `DangerButton` | T-010 | Full-width by default on mobile |
| `Banner` | T-010 | Dismissible inline warning, severity-coloured |
| `Confidence` | T-010 | Renders an AI confidence value as a label, never a bare number |
| `GroundingLink` | T-010 | "Based on: Neon tetra" — tappable, opens the species card or corpus entry |
| `ParameterRow` | T-017 | Name, value (tabular), unit, target range, in/out-of-range indicator |
| `Sparkline` | T-017 | Small trend line for a parameter. Faint grid, emphasised endpoint |
| `ParameterChart` | T-017 | Full chart with target band shaded, thresholds and events marked |
| `PhotoTile` | T-022 | Square, using Next.js `<Image>` with browser caching, tap to expand |
| `SpeciesCard` | T-021 | The Dex card. Front is care facts — **never gated** |

---

## Charts

Parameter graphs are the most-praised feature in the whole competitor set. Treat them as a first-class surface, not an afterthought.

- **Shade the target band** behind the line. Whether a reading is fine should be readable without checking a legend.
- Emphasise the most recent point with a filled dot and its value.
- Faint horizontal grid, no vertical grid, no chart border.
- Out-of-range points render in the severity colour, in-range in `deep`.
- Overlay maintenance events as thin vertical markers — a reviewer asked for exactly this and never got it: *"a vertical line where I dose or do a water change so I can see if changes in the graph line are due to me."*
- Charts must be readable at a glance in dark mode; test both.

---

## Writing in the interface

Words are design material here, and this app has a specific voice problem to avoid: it must be knowledgeable without being a scold.

- **Plain, specific, calm.** "Ammonia is at 2 ppm. That is high enough to burn gills." Not "Warning: parameter exceeds threshold."
- **Never blame.** People come to this app when something has gone wrong and they usually already feel bad. "Your tank is 12 days old — this is normal at this stage" beats "You added fish too early."
- **Buttons say what happens.** "Set reminder", then a confirmation that says "Reminder set".
- **Errors explain the fix.** "Could not read that photo — try turning off the room light and shooting straight through the front glass." Not "Analysis failed."
- **Never say "just".** Nothing is simple to a beginner.
- **Units always shown.** A bare number is a bug.
- **Ranges, not false precision.** "Sources differ: somewhere between 110 and 200 litres" is honest and is a competitive advantage over apps that state one number and get it wrong.

---

## Language and layout

All user-facing strings go through the i18n layer from the first screen. Retrofitting is far more expensive than doing it now.

Hinglish is Latin script, so no font or RTL work is needed — but **Hinglish strings run roughly 15–25% longer than English**. Do not build layouts that only fit the English string. Test every screen with the longest translation.

Species names, chemical names, medication names and parameter names stay in English/Latin in every language. Full rules and examples in `05-content-guide.md`.

---

## Motion

Minimal and functional. Transitions under 200ms. The one place a flourish is worth it is the **Dex card unlock** — that moment is the app's small piece of delight and deserves a real animation.

Respect `prefers-reduced-motion` / the OS reduce-motion setting everywhere, including the Dex unlock.
