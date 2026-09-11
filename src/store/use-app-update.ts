import { create } from "zustand";

// "Update available" banner (2026-09-11, Jaideep's ask — a web app can go
// stale in an open tab after a deploy, unlike a native app store update).
// Deliberately UI state only, not persisted (see use-scan-session.ts's own
// note on this pattern and CLAUDE.md's "SQLite is the only source of
// truth" rule) — a page reload is exactly what clears it anyway.
type AppUpdateState = {
  updateAvailable: boolean;
  applying: boolean;
  registration: ServiceWorkerRegistration | null;
  setRegistration: (reg: ServiceWorkerRegistration | null) => void;
  markUpdateAvailable: () => void;
  applyUpdate: () => void;
};

export const useAppUpdate = create<AppUpdateState>((set, get) => ({
  updateAvailable: false,
  applying: false,
  registration: null,
  setRegistration: (registration) => set({ registration }),
  markUpdateAvailable: () => set({ updateAvailable: true }),
  applyUpdate: () => {
    const { registration, applying } = get();
    const waiting = registration?.waiting;
    if (!waiting || applying) return;
    set({ applying: true });

    // Once the new worker actually takes control, the fresh build is live
    // — reload picks it up. A fallback timeout covers the rare case where
    // controllerchange never fires (e.g. the tab lost focus mid-handoff)
    // so tapping "Update" never just does nothing.
    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
    setTimeout(reload, 3000);

    waiting.postMessage({ type: "SKIP_WAITING" });
  },
}));
