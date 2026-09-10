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
