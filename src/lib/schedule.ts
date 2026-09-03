// Shared by the per-tank Schedule page and the cross-tank Home page (T-028)
// so the two never drift on what counts as "overdue" vs "today".

export type ScheduleBucket = "overdue" | "today" | "week" | "later";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function bucketFor(nextDueAt: string | null, now: Date): ScheduleBucket {
  if (!nextDueAt) return "later";
  const due = new Date(nextDueAt);
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (due < todayStart) return "overdue";
  if (due < todayEnd) return "today";
  if (due < weekEnd) return "week";
  return "later";
}

/**
 * `new Date("2026-08-31")` parses a date-only string as UTC midnight, not
 * local midnight — for anyone east of UTC that's already "yesterday" evening
 * locally, which silently mis-buckets a same-day reschedule as overdue.
 * `<input type="date">` gives exactly this date-only format, so parse it as
 * local midnight explicitly instead of trusting the Date constructor.
 */
export function localDateInputToIso(dateOnly: string): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

/** Inverse of `localDateInputToIso` — an ISO datetime back to a local-timezone "YYYY-MM-DD", for prefilling an `<input type="date">`. Slicing the ISO string directly reads the UTC date, which is wrong for anyone east of UTC (e.g. IST) around midnight — this is the same bug class, the other direction. */
export function isoToLocalDateInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True if `nextDueAt` falls on the same local calendar day as `day`. Used by Home's Day view. */
export function isOnDay(nextDueAt: string | null, day: Date): boolean {
  if (!nextDueAt) return false;
  const due = new Date(nextDueAt);
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return due >= dayStart && due < dayEnd;
}
