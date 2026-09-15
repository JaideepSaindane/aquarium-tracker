import { create } from "zustand";

// Hands a prefilled draft to /community/new (e.g. from a Fish Doctor result:
// "Didn't find a satisfactory answer? Post on community"). UI state only —
// consumed and cleared by the New Post screen on mount.
export const DRAFT_KEY = "aquaai-community-draft";

type CommunityDraftState = {
  body: string | null;
  photo: File | null;
  setDraft: (body: string, photo: File | null) => void;
  clearDraft: () => void;
};

export const useCommunityDraft = create<CommunityDraftState>((set) => ({
  body: null,
  photo: null,
  setDraft: (body, photo) => {
    // Text also saved to sessionStorage so it survives a full page reload
    // (a File can't be serialised, so the photo is in-memory only).
    try {
      sessionStorage.setItem(DRAFT_KEY, body);
    } catch {}
    set({ body, photo });
  },
  clearDraft: () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    set({ body: null, photo: null });
  },
}));
