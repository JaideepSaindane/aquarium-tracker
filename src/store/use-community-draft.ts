import { create } from "zustand";

// Hands a prefilled draft to /community/new (e.g. from a Fish Doctor result:
// "Didn't find a satisfactory answer? Post on community"). UI state only —
// consumed and cleared by the New Post screen on mount.
type CommunityDraftState = {
  body: string | null;
  photo: File | null;
  setDraft: (body: string, photo: File | null) => void;
  takeDraft: () => { body: string | null; photo: File | null };
};

export const useCommunityDraft = create<CommunityDraftState>((set, get) => ({
  body: null,
  photo: null,
  setDraft: (body, photo) => set({ body, photo }),
  takeDraft: () => {
    const { body, photo } = get();
    set({ body: null, photo: null });
    return { body, photo };
  },
}));
