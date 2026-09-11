// App-shell service worker (T-010 install/activate). No offline caching
// strategy yet — that's a separate concern and hasn't blocked anything so
// far, per Principle 05 (SQLite is the real source of truth; the network,
// and this worker, are enhancements). Web Push handling (T-018) was
// removed 2026-09-10 — reminders are gone app-wide.
//
// A new worker deliberately does NOT auto-activate itself (no
// self.skipWaiting() here) — 2026-09-11, the "update available" banner
// feature. Every deploy ships a new build of this file, so the browser
// always sees a byte-for-byte change and installs a new worker, but it now
// sits in the normal "waiting" state until the page's own code tells it to
// take over (see ServiceWorkerRegister.tsx) — that's what lets the app show
// "Update available" and only reload once the user actually taps it,
// instead of silently swapping the app out from under them mid-use.
self.addEventListener("install", () => {
  // Intentionally no skipWaiting() — see the note above.
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
