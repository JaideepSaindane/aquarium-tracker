import { create } from "zustand";
import type { TankScanReport } from "@/server/ai/schemas/tank-scan";

// Ephemeral hand-off between /onboarding/scan and /onboarding/report — the
// photo is already safely written to OPFS before this store is touched, so
// losing this state (e.g. a hard reload mid-flow) never loses the photo,
// only the in-progress report, which can be re-scanned. Nothing here is
// meant to survive a reload; see src/store/use-ui-store.ts for the same
// pattern and CLAUDE.md's "SQLite is the only source of truth" rule.
type ScanSessionState = {
  originalPhotoPath: string | null;
  uploadBlob: Blob | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  city: string;
  report: TankScanReport | null;
  modelName: string | null;
  clarifyingAnswers: Record<string, string>;
  setCapture: (input: { originalPhotoPath: string; uploadBlob: Blob }) => void;
  setDimensions: (input: { lengthCm: number; widthCm: number; heightCm: number; city: string }) => void;
  setReport: (report: TankScanReport, modelName: string) => void;
  setClarifyingAnswer: (id: string, answer: string) => void;
  reset: () => void;
};

const initial = {
  originalPhotoPath: null,
  uploadBlob: null,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  city: "",
  report: null,
  modelName: null,
  clarifyingAnswers: {},
};

export const useScanSession = create<ScanSessionState>((set) => ({
  ...initial,
  setCapture: (input) => set({ originalPhotoPath: input.originalPhotoPath, uploadBlob: input.uploadBlob }),
  setDimensions: (input) => set({ lengthCm: input.lengthCm, widthCm: input.widthCm, heightCm: input.heightCm, city: input.city }),
  setReport: (report, modelName) => set({ report, modelName }),
  setClarifyingAnswer: (id, answer) =>
    set((state) => ({ clarifyingAnswers: { ...state.clarifyingAnswers, [id]: answer } })),
  reset: () => set(initial),
}));
