"use client";

import { useContext } from "react";
import { LocaleContext } from "./LocaleProvider";

/** Full locale context (current locale + setter) — for the language switcher itself. Most components just need `useTranslation()`. */
export function useLocale() {
  return useContext(LocaleContext);
}
