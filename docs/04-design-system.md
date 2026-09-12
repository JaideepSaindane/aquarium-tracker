# 04 — Design system

One purpose: every screen should look like it came from the same app, without Jaideep having to judge visual decisions one screen at a time. Claude Code reads the tokens here and uses nothing else.

**Hard rule: no hard-coded colours, spacing or font sizes in components.** Everything comes from `src/theme/tokens.ts`. If a value is needed that is not here, add it here first.

---

## The feel we are aiming for

Calm, legible, and slightly clinical — closer to a good field notebook than to a game. The app is often opened by someone worried about a dying fish, or standing at a tank with wet hands in bad light. That argues for high contrast, large touch targets, and no decorative noise.

Two things it must not look like: a children's game (undermines the care advice) or a laboratory dashboard (intimidates beginners, who are the primary audience).

Colour carries meaning, not decoration. The severity scale is the most important colour in the app and nothing else is allowed to compete with it.

**Surface treatment (2026-09-10): neutral UI, colourful content.** Static content — cards, banners, list rows, the species grid, the bottom nav — is flat, solid, and neutral: plain white/charcoal cards on an off-white/near-black ground, a soft low-opacity neutral-tinted shadow for lift (`--shadow-sm`/`--shadow-md`, never a glossy highlight or gradient), `--radius-lg` (16px) on cards, bolder type weight on buttons and headings. **Glass — a translucent, blurred background via `--glass-bg`/`--glass-border`/`--glass-blur` — is now reserved for toasts/prompts only** (the Dex-unlock toast, the survival-prompt card); the bottom tab bar and ordinary cards are deliberately *not* glass any more (see 2026-09-10 rebase below) — a floating dock made of blue-tinted glass read as "visually enormous," so it's now a plain, mostly-opaque, quiet white/charcoal bar instead. The guiding rule: the *interface* stays neutral; colour comes from aquarium content — tank photos, fish/plant imagery, species colours — not from painting UI chrome in the brand hue. See the tokens in `src/theme/tokens.css`/`tokens.ts` (`shadow`, `glass`, and the `radius` scale) — component CSS reads from these, never a hard-coded blur/shadow/colour value.

---

## Colour tokens

**Rebased 2026-09-12** onto the redesign brief's dark-first palette (`docs/08-ui-redesign-brief.md`) — the app's fourth identity (teal/orange 2026-08 → navy/sky 2026-09-02 → neutral off-white/charcoal+teal 2026-09-10 → this). The idea is unchanged — *neutral UI chrome + colourful aquarium content* — but dark is now **the default look**, carrying the brief's exact values, and the one brand colour is the aqua `#35C6BE`, reserved for primary actions, active navigation/selection, links and AquaAI identity, nothing else. Light mode is derived, not specified by the brief: the validated 2026-09-10/11 neutrals with the accent family shifted onto the aqua hue (darkened for AA contrast on white — the bright aqua is a fill colour, not a text colour, in light mode). Severity keeps its own separate semantic scale — those colours are safety-critical and never doubled as brand colour; the brief's healthy/warning/danger hues map onto it, structure unchanged.

```ts
// src/theme/tokens.ts — dark is the default look (2026-09-12)

export const light = {
  ground:      '#F6F7F5',  // app background — warm, neutral off-white
  surface:     '#FFFFFF',  // cards
  surfaceAlt:  '#ECECEA',  // inputs, chips, inset areas — plain neutral grey, not accent-tinted
  ink:         '#17201E',  // primary text — near-black charcoal, never pure black
  inkMuted:    '#5F6F6D',  // secondary text
  inkFaint:    '#687876',  // muted text + input placeholders
  line:        '#C7D1CF',  // borders
  lineSoft:    '#D9E1DF',  // internal dividers

  accent:      '#0D7A73',  // darkened aqua — the text/links grade of the brand colour on white
  accentSoft:  '#D5F1EE',
  deep:        '#0B6B65',  // primary-action fill — white button text passes AA on it
  deepSoft:    '#C8ECE8',
}

export const dark = {
  ground:      '#0B1112',  // the brief's background
  surface:     '#151D1E',
  surfaceAlt:  '#1C2627',  // elevated surface — inputs, chips, secondary fills
  ink:         '#F3F6F5',
  inkMuted:    '#9BA9A8',
  inkFaint:    '#71807F',
  line:        '#293637',
  lineSoft:    '#232E2F',

  accent:      '#35C6BE',  // the one aqua — primary actions, active nav/selection, links, brand
  accentSoft:  '#143432',
  deep:        '#35C6BE',  // the same aqua: primary buttons are solid aqua with dark text
  deepSoft:    '#143432',
}

// Severity — the only colours allowed to signal state.
// Deliberately separate from `accent` so an action never reads as an alarm.
// Hues are the brief's danger/warning/healthy; light variants darkened for AA.
export const severity = {
  fixNow:  { light: '#B4432E', dark: '#E77967' },   // fish are being harmed
  watch:   { light: '#8F640F', dark: '#E7B75E' },   // will cause problems
  improve: { light: '#2C7A52', dark: '#65C98B' },   // better, no urgency
  neutral: { light: '#57696B', dark: '#94A8A9' },
}
```

Shadows are a neutral charcoal tint (`rgba(23, 32, 30, …)` in light, plain black in dark) rather than a colored brand wash — a shadow should read as "shadow," not as brand colour. Glass surfaces (`--glass-bg`/`--glass-border`, now used only for toasts/prompts — see "Surface treatment" above) are a neutral near-white/near-black tint, not a blue- or teal-tinted glass.

**Dark is the default look (2026-09-12), and light mode is not optional either.** People check tanks at night with the room light off — the brief's dark palette is what a new user sees first. The Appearance setting (light/dark/system) keeps working: light values live under `prefers-color-scheme: light` and `[data-theme="light"]` in `tokens.css`. Build and test both from day one; retrofitting is far more expensive.

Accessibility: body text meets WCAG AA against its surface in both themes. Severity is never signalled by colour alone — every severity indicator carries an icon and a text label, because red/green colour blindness affects roughly 8% of men and this app's whole job is communicating problems.

---

## Type

System fonts. No custom font files: they add bundle size and load risk for no benefit in an app that is read, not admired. Scale rebased 2026-09-12 to the brief's: display 32, screen title 28, section 20, body 16, secondary 14, caption 12 — only the information that deserves attention should look important.

```ts
export const type = {
  display:  { size: 32, weight: '700', lineHeight: 36, letterSpacing: -0.5 },
  title:    { size: 28, weight: '700', lineHeight: 34, letterSpacing: -0.3 },
  heading:  { size: 20, weight: '700', lineHeight: 26 },
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
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 }  // 8-point scale: 4/8/12/16/24/32/40
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 }  // inputs 12, cards 16, large surfaces 20, pills 999
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
| `Card` | T-010 | Surface, radius `lg` (16px), hairline border. The default container |
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
