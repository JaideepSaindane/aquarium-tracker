"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "aquaai_theme";

const ThemeContext = createContext<{ theme: ThemeChoice; setTheme: (t: ThemeChoice) => void }>({
  theme: "system",
  setTheme: () => {},
});

/** For the theme switcher itself; most components don't need this. */
export function useTheme() {
  return useContext(ThemeContext);
}

function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system"; // private-browsing / storage blocked — fall back quietly
  }
}

/**
 * A pure UI preference, same reasoning as LocaleProvider: localStorage
 * instead of the SQLite `settings` table, since it needs to apply before
 * the database finishes booting to avoid a flash of the wrong theme.
 * Applies as `data-theme` on `<html>` — tokens.css's `:root[data-theme=...]`
 * selectors key off exactly that.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readStoredTheme());
  }, []);

  useEffect(() => {
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
      // Let the browser pick native form-control colours from the OS
      // preference too, same as our CSS does via prefers-color-scheme.
      document.documentElement.style.colorScheme = "light dark";
    } else {
      document.documentElement.setAttribute("data-theme", theme);
      // The bug this fixes: `color-scheme: light dark` (set in
      // globals.css's <html>) tells the browser to colour native controls
      // — dropdowns, checkboxes, date/number inputs, autofill — off the
      // OS preference, completely independent of our own `data-theme`
      // override. So picking "Light" while the OS is in dark mode left
      // native field chrome dark-on-light and unreadable. Pinning
      // `color-scheme` to match the explicit choice fixes it at the source
      // rather than fighting each native control's colours individually.
      document.documentElement.style.colorScheme = theme;
    }
  }, [theme]);

  function setTheme(next: ThemeChoice) {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked — the switch still applies for this session
    }
  }

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
