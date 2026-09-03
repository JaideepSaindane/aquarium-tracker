import en from "./en";
import hiLatn from "./hi-latn";
import type { Dictionary, Locale } from "./types";

export const dictionaries: Record<Locale, Dictionary> = {
  en,
  "hi-latn": hiLatn,
};

export const defaultLocale: Locale = "en";
