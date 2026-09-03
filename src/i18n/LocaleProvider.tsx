"use client";

import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLocale, dictionaries } from "./dictionaries";
import type { Dictionary, Locale } from "./types";

const STORAGE_KEY = "aquaai_locale";

export const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dictionary: Dictionary;
}>({
  locale: defaultLocale,
  setLocale: () => {},
  dictionary: dictionaries[defaultLocale],
});

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "hi-latn" ? "hi-latn" : defaultLocale;
  } catch {
    return defaultLocale; // private-browsing / storage blocked — fall back quietly
  }
}

/**
 * A pure UI preference (which language to render in), not app data — so
 * this deliberately uses localStorage rather than the SQLite `settings`
 * table: it needs to be readable synchronously on first paint, before the
 * database has finished booting (DbBootProvider), to avoid a flash of the
 * wrong language.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    // Deliberately not a lazy useState initializer: this reads
    // localStorage, which doesn't exist during server rendering — using it
    // as an initializer would render English on the server and possibly
    // Hinglish on the client's first paint, a hydration mismatch. One
    // effect-driven update after mount is the standard, safe pattern for
    // syncing from a browser-only store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(readStoredLocale());
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked — the switch still applies for this session
    }
  }

  const value = useMemo(() => ({ locale, setLocale, dictionary: dictionaries[locale] }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
