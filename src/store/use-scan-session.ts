import { create } from "zustand";
import type { HealthCheckReport } from "@/server/ai/schemas/health-check";

// Ephemeral hand-off between /onboarding/scan and /onboarding/report — the
// photo is already safely written to OPFS before this store is touched, so
// losing this state (e.g. a hard reload mid-flow) never loses the photo,
// only the in-progress report, which can be re-scanned. Nothing here is
// meant to survive a reload; see src/store/use-ui-store.ts for the same
// pattern and CLAUDE.md's "SQLite is the only source of truth" rule.
//
// The onboarding first scan runs the Health Check contract (health-check/v1)
// rather than the Tank Scan contract, per Jaideep's direct feedback ("I
// found the first tank scan to be utterly useless. The health scan was
// fantastic") — same diagnostic prompt used for every later re-check. That
// prompt has no setup/equipment/plant extraction, so the new tank it
// creates starts bare (same as skipping the scan entirely) rather than
// auto-populated from the photo — a deliberate tradeoff Jaideep chose over
// running two AI calls to keep both the findings and the old auto-fill.
type ScanSessionState = {
  originalPhotoPath: string | null;
  uploadBlob: Blob | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  city: string;
  report: HealthCheckReport | null;
  modelName: string | null;
  clarifyingAnswers: Record<string, string>;
  setCapture: (input: { originalPhotoPath: string; uploadBlob: Blob }) => void;
  setDimensions: (input: { lengthCm: number; widthCm: number; heightCm: number; city: string }) => void;
  setReport: (report: HealthCheckReport, modelName: string) => void;
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
