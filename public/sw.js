// App-shell service worker (T-010 install/activate). No offline caching
// strategy yet — that's a separate concern and hasn't blocked anything so
// far, per Principle 05 (SQLite is the real source of truth; the network,
// and this worker, are enhancements). Web Push handling (T-018) was
// removed 2026-09-10 — reminders are gone app-wide.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
