/**
 * Caps a free-text field before it's interpolated into an AI prompt.
 * 2026-09-15 security review: several AI routes accepted unbounded text
 * from the client (a question, a tank-context blob, a symptom
 * description) with no length limit — since every Gemini call costs more
 * the longer the prompt, and phone+PIN sign-up has no verification
 * (CLAUDE.md), an unbounded field is a real cost-abuse lever, not just a
 * theoretical one. Truncates silently rather than rejecting the request —
 * consistent with "advise, never block" (Principle 01): a genuinely long
 * tank history should still get a usable, if trimmed, answer rather than
 * a hard error.
 */
export function capText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
