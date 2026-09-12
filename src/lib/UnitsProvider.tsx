"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UnitSystem } from "./units";

const STORAGE_KEY = "aquaai_units";

const UnitsContext = createContext<{ units: UnitSystem; setUnits: (u: UnitSystem) => void }>({
  units: "metric",
  setUnits: () => {},
});

/** For the units switcher itself; most components just need `useUnits()`. */
export function useUnitsContext() {
  return useContext(UnitsContext);
}

function readStoredUnits(): UnitSystem {
  if (typeof window === "undefined") return "metric";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric"; // private-browsing / storage blocked — fall back quietly
  }
}

/**
 * A pure UI preference, same reasoning as ThemeProvider/LocaleProvider:
 * localStorage instead of the server `settings` table — this is purely
 * "how do I want numbers displayed on this device," never data that needs
 * to follow the account across devices, and every stored value stays
 * metric regardless (CLAUDE.md's rule) — this only controls the display
 * layer via src/lib/units.ts's formatters.
 */
export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<UnitSystem>("metric");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnitsState(readStoredUnits());
  }, []);

  function setUnits(next: UnitSystem) {
    setUnitsState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked — the switch still applies for this session
    }
  }

  const value = useMemo(() => ({ units, setUnits }), [units]);

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

/** Read-only access to the current display unit system — what every screen that shows a length/volume/temperature should call. */
export function useUnits(): UnitSystem {
  return useUnitsContext().units;
}
