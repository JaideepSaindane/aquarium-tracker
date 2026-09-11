// Cheap client-side heuristic for "should we offer a Translate link on this
// post" (2026-09-11, Community feature) — catches text written in a
// non-Latin script (Devanagari, Arabic, Bengali, Tamil, Telugu, Kannada,
// Malayalam, CJK, Hangul). Deliberately does NOT try to detect a different
// language written in Latin script (Spanish, French, or romanized Hindi/
// Hinglish itself) — there's no translation library in this app and a
// real language-ID model is out of scope for a "Translate" link; this is
// a conservative first pass, not a claim of full language detection.
export function looksNonEnglish(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 8) return false; // too short to judge without false positives
  const nonLatin = trimmed.match(
    /[ऀ-ॿ؀-ۿঀ-৿਀-੿଀-୿஀-௿ఀ-౿ಀ-೿ഀ-ൿ぀-ヿ一-鿿가-힯]/g
  );
  return !!nonLatin && nonLatin.length / trimmed.length > 0.15;
}
