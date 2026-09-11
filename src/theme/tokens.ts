// Mirrors docs/04-design-system.md exactly. This file is the source of truth
// for values used in TypeScript (e.g. chart colours picked programmatically);
// `tokens.css` mirrors the same values as CSS custom properties for use in
// component stylesheets. If a value changes, change it in both places.
//
// Palette rebased 2026-09-10 onto a neutral off-white/charcoal system with a
// single muted-teal accent — see the comment at the top of tokens.css for
// the source hexes and reasoning ("neutral UI chrome + colourful aquarium
// content"). Replaces the previous navy→sky-blue identity (2026-09-02); the
// `soft` export below is kept only as an alias so older screens don't need
// editing (see tokens.css).

export const light = {
  ground: "#F6F7F5",
  surface: "#FFFFFF",
  surfaceAlt: "#ECECEA",
  ink: "#18242B",
  inkMuted: "#65747A",
  // Darkened 2026-09-11 — see the matching comment in tokens.css (cards/
  // pills/inputs weren't separating from the white surface behind them).
  line: "#C7D1CF",
  lineSoft: "#D9E1DF",

  accent: "#168A8A",
  accentSoft: "#DDF1EE",
  deep: "#12706F",
  deepSoft: "#CFEEE9",
} as const;

export const dark = {
  // Rebalanced 2026-09-10 — see the matching comment in tokens.css for why
  // (cards/pills merging into the background, unclear search fields).
  ground: "#10151A",
  surface: "#1E262A",
  surfaceAlt: "#2A3438",
  ink: "#E7ECEA",
  inkMuted: "#8FA0A0",
  line: "#3D4A4E",
  lineSoft: "#333F43",

  accent: "#4FCFC6",
  accentSoft: "#163332",
  deep: "#2FBDB5",
  deepSoft: "#163332",
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

// Matte elevation + selective glass — mirrors tokens.css. Shadows are a
// neutral charcoal tint now, not a colored wash, per the "neutral UI" rule.
// Glass is only for surfaces that genuinely float over content (toasts,
// prompts); everything else, including the bottom nav, is flat/solid now.
// Light-mode shadows strengthened 2026-09-11 alongside `line`/`lineSoft`
// above — same "cards aren't popping off white" fix.
export const shadow = {
  sm: { light: "0 1px 3px rgba(24, 36, 43, 0.1), 0 1px 2px rgba(24, 36, 43, 0.1)", dark: "0 1px 3px rgba(0, 0, 0, 0.32), 0 1px 2px rgba(0, 0, 0, 0.4)" },
  md: { light: "0 8px 24px rgba(24, 36, 43, 0.14), 0 2px 6px rgba(24, 36, 43, 0.08)", dark: "0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3)" },
  lift: { light: "0 12px 32px rgba(24, 36, 43, 0.18), 0 4px 10px rgba(24, 36, 43, 0.1)", dark: "0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.36)" },
} as const;

export const glass = {
  light: { bg: "rgba(255, 255, 255, 0.78)", border: "rgba(24, 36, 43, 0.14)" },
  dark: { bg: "rgba(27, 34, 36, 0.78)", border: "rgba(255, 255, 255, 0.08)" },
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
