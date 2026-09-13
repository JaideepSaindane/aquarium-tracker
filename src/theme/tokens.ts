// Mirrors docs/04-design-system.md exactly. This file is the source of truth
// for values used in TypeScript (e.g. chart colours picked programmatically);
// `tokens.css` mirrors the same values as CSS custom properties for use in
// component stylesheets. If a value changes, change it in both places.
//
// Rebased 2026-09-12 onto the redesign brief's dark-first palette
// (docs/08-ui-redesign-brief.md) — see the header comment in tokens.css for
// the full reasoning. Dark is the app's default look and carries the brief's
// exact values; light is derived (the validated 2026-09-10/11 neutrals with
// the accent family on the aqua hue, darkened for AA contrast on white).
// The brief's healthy/warning/danger hues map onto the severity scale below —
// structure unchanged, hues rebased. The `soft` export stays as an alias so
// older screens don't need editing.
//
// Reskinned 2026-09-13 onto a navy-ground/blue-accent palette (the app's
// fifth identity) — see tokens.css's header comment for the full reasoning.
// Only these two colour objects (and glass.dark.bg) actually changed value;
// the severity scale, shadows, type scale and spacing are untouched.

export const light = {
  ground: "#F6F7F5",
  surface: "#FFFFFF",
  surfaceAlt: "#ECECEA",
  ink: "#17201E",
  inkMuted: "#5F6F6D",
  // Muted text + input placeholders (brief's "muted text" tier).
  inkFaint: "#687876",
  line: "#C7D1CF",
  lineSoft: "#D9E1DF",

  // Darkened blues (2026-09-13, was aqua) — the bright #3B82F6 brand blue is
  // a fill colour, not a text colour, on white; these pass AA for text and
  // primary-button fills.
  accent: "#2955C9",
  accentSoft: "#DFE7FB",
  deep: "#1D4ED8",
  deepSoft: "#DFE7FB",
} as const;

export const dark = {
  // Navy ground (2026-09-13, was the brief's near-black teal-tinted values).
  ground: "#0B0F1A",
  surface: "#141A2B",
  surfaceAlt: "#1C2440",
  ink: "#F3F6FB",
  inkMuted: "#93A0C2",
  inkFaint: "#6F7BA0",
  line: "#26304A",
  lineSoft: "#1E2740",

  // One blue (2026-09-13, was aqua #35C6BE): accent (text/links/active) and
  // deep (primary-action fill) are the same colour in dark mode — primary
  // buttons are solid blue with dark navy text, same convention as before,
  // just recoloured.
  accent: "#3B82F6",
  accentSoft: "#16213F",
  deep: "#3B82F6",
  deepSoft: "#16213F",
} as const;

// Severity — the only colours allowed to signal state. Deliberately separate
// from `accent` so an action never reads as an alarm. Hues rebased 2026-09-12
// to the brief's danger/warning/healthy; light variants darkened for AA on white.
export const severity = {
  fixNow: { light: "#B4432E", dark: "#E77967" },
  watch: { light: "#8F640F", dark: "#E7B75E" },
  improve: { light: "#2C7A52", dark: "#65C98B" },
  neutral: { light: "#57696B", dark: "#94A8A9" },
} as const;

export type SeverityLevel = keyof typeof severity;

// Matte elevation + selective glass — mirrors tokens.css. Shadows are a
// neutral tint, not a colored wash, per the "neutral UI" rule. Glass is only
// for surfaces that genuinely float over content (toasts, prompts); everything
// else, including the bottom nav, is flat/solid.
export const shadow = {
  sm: { light: "0 1px 3px rgba(23, 32, 30, 0.1), 0 1px 2px rgba(23, 32, 30, 0.1)", dark: "0 1px 3px rgba(0, 0, 0, 0.32), 0 1px 2px rgba(0, 0, 0, 0.4)" },
  md: { light: "0 8px 24px rgba(23, 32, 30, 0.14), 0 2px 6px rgba(23, 32, 30, 0.08)", dark: "0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3)" },
  lift: { light: "0 12px 32px rgba(23, 32, 30, 0.18), 0 4px 10px rgba(23, 32, 30, 0.1)", dark: "0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.36)" },
} as const;

export const glass = {
  light: { bg: "rgba(255, 255, 255, 0.78)", border: "rgba(23, 32, 30, 0.14)" },
  dark: { bg: "rgba(20, 26, 43, 0.78)", border: "rgba(255, 255, 255, 0.08)" },
  blur: "20px",
} as const;

// Kept only as an alias to `light`/`dark` above, so the Tanks home / Species
// Dex / species-detail screens (built 2026-09-02 against their own scoped
// palette, before that palette was folded into the main tokens) don't need
// editing — there is no second real palette. Mirrors the `--soft-*` custom
// properties in tokens.css.
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

// Type scale rebased 2026-09-12 to the brief's: display 32, screen title 28,
// section 20, body 16, secondary 14, caption 12.
export const type = {
  display: { size: 32, weight: 700, lineHeight: 36, letterSpacing: -0.5 },
  title: { size: 28, weight: 700, lineHeight: 34, letterSpacing: -0.3 },
  heading: { size: 20, weight: 700, lineHeight: 26 },
  body: { size: 16, weight: 400, lineHeight: 24 },
  bodySm: { size: 14, weight: 400, lineHeight: 20 },
  label: { size: 12, weight: 600, lineHeight: 16, letterSpacing: 0.6 },
  data: { size: 16, weight: 600 },
  caption: { size: 12, weight: 400, lineHeight: 16 },
} as const;

// 8-point scale per the brief: 4 / 8 / 12 / 16 / 24 / 32 / 40.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 } as const;
// Radius system per the brief: inputs 12, cards 16, large surfaces 20, pills 999.
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const hitSlop = 8; // minimum touch target 44x44 including slop
