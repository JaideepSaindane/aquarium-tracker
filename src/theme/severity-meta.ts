import type { SeverityLevel } from "./tokens";

// Every severity indicator carries an icon and a text label, never colour
// alone — docs/04-design-system.md, because colour-blindness affects a real
// share of users and this app's whole job is communicating problems.
export const severityMeta: Record<SeverityLevel, { label: string; icon: string; cssVar: string }> = {
  fixNow: { label: "Fix now", icon: "!", cssVar: "--color-fix-now" },
  watch: { label: "Watch", icon: "◎", cssVar: "--color-watch" }, // ◎
  improve: { label: "Improve", icon: "↑", cssVar: "--color-improve" }, // ↑
  neutral: { label: "Note", icon: "•", cssVar: "--color-neutral" }, // •
};
