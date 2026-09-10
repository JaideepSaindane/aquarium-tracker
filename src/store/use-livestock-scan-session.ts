import { create } from "zustand";

// Ephemeral hand-off between the tank overview's "Add a fish" popup and
// /tank/[id]/livestock/scan — lets "📷 Take a pic" open the camera/gallery
// choice immediately instead of navigating to a page that then asks the
// same question again with its own "Take a photo or upload one" button.
// Same one-shot, in-memory pattern as src/store/use-scan-session.ts.
type LivestockScanSessionState = {
  pendingFile: File | null;
  setPendingFile: (file: File) => void;
  takePendingFile: () => File | null;
};

export const useLivestockScanSession = create<LivestockScanSessionState>((set, get) => ({
  pendingFile: null,
  setPendingFile: (file) => set({ pendingFile: file }),
  takePendingFile: () => {
    const file = get().pendingFile;
    set({ pendingFile: null });
    return file;
  },
}));
