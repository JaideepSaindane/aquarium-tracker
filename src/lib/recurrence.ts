// Deliberately not full RFC5545 RRULE — the six presets (specs/T-018) only
// ever need "every N days", so a tiny custom format keeps this dependency-free
// and easy to reason about. Format: "every_<N>_days". Anything else (or
// null) is treated as one-off / non-recurring.
const PATTERN = /^every_(\d+)_days$/;

export function intervalDays(rrule: string | null | undefined): number | null {
  if (!rrule) return null;
  const match = PATTERN.exec(rrule);
  return match ? Number(match[1]) : null;
}

export function makeRrule(days: number): string {
  return `every_${days}_days`;
}

/** Next occurrence after `fromIso`, or null if `rrule` isn't recurring. */
export function nextOccurrence(fromIso: string, rrule: string | null | undefined): string | null {
  const days = intervalDays(rrule);
  if (days === null) return null;
  const next = new Date(fromIso);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}
