# 04 — Design system

One purpose: every screen should look like it came from the same app, without Jaideep having to judge visual decisions one screen at a time. Claude Code reads the tokens here and uses nothing else.

**Hard rule: no hard-coded colours, spacing or font sizes in components.** Everything comes from `src/theme/tokens.ts`. If a value is needed that is not here, add it here first.

---

## The feel we are aiming for

Calm, legible, and slightly clinical — closer to a good field notebook than to a game. The app is often opened by someone worried about a dying fish, or standing at a tank with wet hands in bad light. That argues for high contrast, large touch targets, and no decorative noise.

Two things it must not look like: a children's game (undermines the care advice) or a laboratory dashboard (intimidates beginners, who are the primary audience).

Colour carries meaning, not decoration. The severity scale is the most important colour in the app and nothing else is allowed to compete with it.

**Surface treatment (2026-09-10): neutral UI, colourful content.** Static content — cards, banners, list rows, the species grid, the bottom nav — is flat, solid, and neutral: plain white/charcoal cards on an off-white/near-black ground, a soft low-opacity neutral-tinted shadow for lift (`--shadow-sm`/`--shadow-md`, never a glossy highlight or gradient), `--radius-lg` (20px) on cards, bolder type weight on buttons and headings. **Glass — a translucent, blurred background via `--glass-bg`/`--glass-border`/`--glass-blur` — is now reserved for toasts/prompts only** (the Dex-unlock toast, the survival-prompt card); the bottom tab bar and ordinary cards are deliberately *not* glass any more (see 2026-09-10 rebase below) — a floating dock made of blue-tinted glass read as "visually enormous," so it's now a plain, mostly-opaque, quiet white/charcoal bar instead. The guiding rule: the *interface* stays neutral; colour comes from aquarium content — tank photos, fish/plant imagery, species colours — not from painting UI chrome in the brand hue. See the tokens in `src/theme/tokens.css`/`tokens.ts` (`shadow`, `glass`, and the `radius` scale) — component CSS reads from these, never a hard-coded blur/shadow/colour value.

---

## Colour tokens

**Rebased 2026-09-10** onto a neutral off-white/charcoal system with a single muted-teal accent, per a design direction Jaideep shared — replaces the previous navy→sky-blue identity (2026-09-02 rebase, itself replacing an earlier teal/burnt-orange one). The idea: *neutral UI chrome + colourful aquarium content* — chrome (backgrounds, cards, nav, borders, shadows) stays a calm off-white/charcoal/grey; the one accent colour (a muted teal) marks actions and active states; real colour comes from tank photos, fish and plant imagery, not from tinting the interface itself blue. Severity keeps its own separate semantic scale, untouched by this change — those colours are safety-critical and never doubled as brand colour.

```ts
// src/theme/tokens.ts

export const light = {
  ground:      '#F6F7F5',  // app background — warm, neutral off-white
  surface:     '#FFFFFF',  // cards
  surfaceAlt:  '#ECECEA',  // inputs, chips, inset areas — plain neutral grey, not accent-tinted
  ink:         '#18242B',  // primary text — near-black charcoal, never pure black
  inkMuted:    '#65747A',  // secondary text
  line:        '#E3E8E7',  // borders
  lineSoft:    '#EDF1F0',  // internal dividers

  accent:      '#168A8A',  // muted teal — the app's one brand colour, secondary actions/active states
  accentSoft:  '#DDF1EE',
  deep:        '#12706F',  // slightly darker teal — primary buttons, headlines, key UI
  deepSoft:    '#CFEEE9',  // highlight fills, positive-state chips
}

export const dark = {
  ground:      '#12181A',  // near-black warm charcoal
  surface:     '#1B2224',
  surfaceAlt:  '#212A2C',
  ink:         '#E7ECEA',  // pale neutral as text
  inkMuted:    '#8FA0A0',
  line:        '#2A3335',
  lineSoft:    '#232B2D',

  accent:      '#4FCFC6',  // brighter teal — pops on near-black
  accentSoft:  '#163332',
  deep:        '#2FBDB5',  // primary-button teal in dark mode
  deepSoft:    '#163332',
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

Shadows are a neutral charcoal tint (`rgba(24, 36, 43, …)`) rather than a colored brand wash — a shadow should read as "shadow," not as brand colour. Glass surfaces (`--glass-bg`/`--glass-border`, now used only for toasts/prompts — see "Surface treatment" above) are a neutral near-white/near-black tint, not a blue- or teal-tinted glass.

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
