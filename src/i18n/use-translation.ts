"use client";

import { useContext } from "react";
import { LocaleContext } from "./LocaleProvider";

/** Returns the current dictionary. Usage: const t = useTranslation(); t.tabs.tanks */
export function useTranslation() {
  return useContext(LocaleContext).dictionary;
}
