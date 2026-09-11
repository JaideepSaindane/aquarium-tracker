// App-shell service worker (T-010 install/activate). No offline caching
// strategy yet — that's a separate concern and hasn't blocked anything so
// far, per Principle 05 (SQLite is the real source of truth; the network,
// and this worker, are enhancements). Web Push handling (T-018) was
// removed 2026-09-10 — reminders are gone app-wide.
//
// A new worker deliberately does NOT auto-activate itself (no
// self.skipWaiting() here) — 2026-09-11, the "update available" banner
// feature. The browser only detects a new worker when THIS FILE's own
// bytes change (it's a static file, not processed/hashed by the Next.js
// build — an ordinary app code change elsewhere does not touch this file
// at all, so it alone doesn't trigger an update check). When this file
// does change, the new worker sits in the normal "waiting" state until
// the page's own code tells it to take over (see ServiceWorkerRegister.tsx)
// — that's what lets the app show "Update available" and only reload once
// the user actually taps it, instead of silently swapping the app out
// from under them mid-use. SW_VERSION below exists only so an otherwise
// no-op change to this file still has different bytes for the browser to
// notice — bump it any time you specifically want to force this check
// (e.g. testing the banner itself); it is never read by any code.
const SW_VERSION = "2026-09-11b";
void SW_VERSION;

self.addEventListener("install", () => {
  // Intentionally no skipWaiting() — see the note above.
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
