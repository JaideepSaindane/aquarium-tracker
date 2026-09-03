import { create } from "zustand";

// Ephemeral UI state only — per CLAUDE.md, anything that must survive a
// reload belongs in SQLite (from T-011 onward), not here. This store exists
// now so later tasks have a place to put things like "selected tank" or
// "active filter" without re-deciding the pattern each time.
type UIState = {
  selectedTankId: string | null;
  setSelectedTankId: (id: string | null) => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedTankId: null,
  setSelectedTankId: (id) => set({ selectedTankId: id }),
}));
