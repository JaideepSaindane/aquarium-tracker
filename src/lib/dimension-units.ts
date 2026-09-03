// Shared by every screen with a cm/ft dimension toggle (tank/new,
// tank/[id]/size, the Tank Scan capture step) so the conversion behaves
// identically everywhere. CLAUDE.md: metric is the stored source of
// truth, converted only at the display layer — these helpers convert
// display-unit strings to/from cm; callers always persist the cm value.

export const CM_PER_FT = 30.48;

export function convertDimension(value: string, from: "cm" | "ft", to: "cm" | "ft"): string {
  if (!value || from === to) return value;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  const cm = from === "cm" ? num : num * CM_PER_FT;
  const result = to === "cm" ? cm : cm / CM_PER_FT;
  return String(Math.round(result * 10) / 10);
}
