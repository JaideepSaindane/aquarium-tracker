import { create } from "zustand";

// Captures the browser's `beforeinstallprompt` event so an in-app "Install
// App" button can trigger the real native install flow in one tap, instead
// of sending someone to a browser menu (Jaideep: installing shouldn't
// require going to Chrome, then Settings, then Install). Chrome only fires
// this event once, early, and only if nothing has called
// `preventDefault()` on it and then dropped the reference — so it has to be
// captured globally at app boot (InstallPromptListener) and held here for
// whichever screen the user later taps "Install App" on. Not persisted:
// the event object itself can't be serialized, and a fresh page load gets
// a fresh event anyway if the app is still installable.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPromptState = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  setDeferredPrompt: (e: BeforeInstallPromptEvent | null) => void;
  markInstalled: () => void;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export const useInstallPrompt = create<InstallPromptState>((set, get) => ({
  deferredPrompt: null,
  installed: false,
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
  markInstalled: () => set({ installed: true, deferredPrompt: null }),
  promptInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Chrome only lets a given prompt be used once.
    set({ deferredPrompt: null });
    return outcome;
  },
}));
