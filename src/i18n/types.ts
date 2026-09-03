import type en from "./en";

// Adding a locale here forces every dictionary to satisfy the same shape as
// `en`, so a missing key is a build error rather than a silent blank
// string in the UI. "hi-latn" = Hinglish, Latin script — see specs/T-024
// for why Devanagari is deliberately out of scope.
export type Locale = "en" | "hi-latn";

// `en` is declared `as const` so its own values are literal string types —
// useful for autocomplete, but it would also force every other locale to
// use the exact same English text. Widen every leaf back to `string` so a
// translation dictionary only has to match the *shape*, not the wording.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
