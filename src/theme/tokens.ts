// Mirrors docs/04-design-system.md exactly. This file is the source of truth
// for values used in TypeScript (e.g. chart colours picked programmatically);
// `tokens.css` mirrors the same values as CSS custom properties for use in
// component stylesheets. If a value changes, change it in both places.
//
// Palette rebased 2026-09-02 onto a tonal navy→sky blue system per a design
// brief Jaideep shared — see the comment at the top of tokens.css for the
// source hexes and reasoning. This is now the app's one real palette; the
// old `soft` export below is kept only as an alias so the three screens
// built against it don't need editing (see tokens.css).

export const light = {
  ground: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#D6E8F7",
  ink: "#021024",
  inkMuted: "#3C6A93",
  line: "#C7DCED",
  lineSoft: "#DCEBF7",

  accent: "#5483B3",
  accentSoft: "#D0E4F5",
  deep: "#052659",
  deepSoft: "#A8DDFA",
} as const;

export const dark = {
  ground: "#021024",
  surface: "#0A1D3A",
  surfaceAlt: "#0E2749",
  ink: "#E7F3FF",
  inkMuted: "#8FB4D6",
  line: "#173A63",
  lineSoft: "#102C50",

  accent: "#7DA0CA",
  accentSoft: "#0E2749",
  deep: "#5483B3",
  deepSoft: "#123458",
} as const;

// Severity — the only colours allowed to signal state. Deliberately separate
// from `accent` so an action never reads as an alarm.
export const severity = {
  fixNow: { light: "#A93520", dark: "#E0725C" },
  watch: { light: "#9C6E0C", dark: "#D6A63C" },
  improve: { light: "#2C7A52", dark: "#5FBE8A" },
  neutral: { light: "#57696B", dark: "#94A8A9" },
} as const;

export type SeverityLevel = keyof typeof severity;

// Matte elevation + selective glass — mirrors tokens.css. Shadows are
// deliberately colored navy in light mode, not neutral grey, per the brief.
// Glass is only for surfaces that genuinely float over content (bottom nav,
// floating buttons, toasts/prompts); everything else stays flat matte.
export const shadow = {
  sm: { light: "0 1px 3px rgba(5, 38, 89, 0.08), 0 1px 2px rgba(5, 38, 89, 0.1)", dark: "0 1px 3px rgba(0, 0, 0, 0.32), 0 1px 2px rgba(0, 0, 0, 0.4)" },
  md: { light: "0 8px 24px rgba(5, 38, 89, 0.12), 0 2px 6px rgba(5, 38, 89, 0.08)", dark: "0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3)" },
  lift: { light: "0 12px 32px rgba(5, 38, 89, 0.18), 0 4px 10px rgba(5, 38, 89, 0.1)", dark: "0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.36)" },
} as const;

export const glass = {
  light: { bg: "rgba(240, 247, 255, 0.68)", border: "rgba(255, 255, 255, 0.6)" },
  dark: { bg: "rgba(5, 38, 89, 0.55)", border: "rgba(196, 224, 255, 0.12)" },
  blur: "20px",
} as const;

// Kept only as an alias to `light`/`dark` above, so the Tanks home / Species
// Dex / species-detail screens (built 2026-09-02 against their own scoped
// palette, before this rebase) don't need editing — there is no second real
// palette anymore. Mirrors the `--soft-*` custom properties in tokens.css.
export const soft = {
  light: {
    bg: light.ground,
    bgAlt: light.surfaceAlt,
    cardBg: glass.light.bg,
    cardBorder: glass.light.border,
    accent: light.deep,
    accentStrong: light.ink,
    accentSoft: light.accentSoft,
    ink: light.ink,
    inkMuted: light.inkMuted,
  },
  dark: {
    bg: dark.ground,
    bgAlt: dark.surfaceAlt,
    cardBg: glass.dark.bg,
    cardBorder: glass.dark.border,
    accent: dark.deep,
    accentStrong: dark.accent,
    accentSoft: dark.accentSoft,
    ink: dark.ink,
    inkMuted: dark.inkMuted,
  },
} as const;

export const type = {
  display: { size: 34, weight: 700, lineHeight: 38, letterSpacing: -0.5 },
  title: { size: 24, weight: 700, lineHeight: 29, letterSpacing: -0.3 },
  heading: { size: 17, weight: 700, lineHeight: 22 },
  body: { size: 16, weight: 400, lineHeight: 24 },
  bodySm: { size: 14, weight: 400, lineHeight: 20 },
  label: { size: 12, weight: 600, lineHeight: 16, letterSpacing: 0.6 },
  data: { size: 16, weight: 600 },
  caption: { size: 12, weight: 400, lineHeight: 16 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const hitSlop = 8; // minimum touch target 44x44 including slop
