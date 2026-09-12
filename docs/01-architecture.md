# 01 — Architecture

Decisions and their reasoning. Pivoted from a native Expo/React Native plan to a mobile-first web app on **31 August 2026** — Jaideep wants the same product, on the web, not in an app store. This file replaces the previous native-focused version; raw native research is kept in `01-architecture-research.md` for historical reference only and should not be followed.

---

## Shape of the system

```
┌─────────────────────────────────────────────┐
│  Next.js app (installable PWA)               │
│  mobile-first responsive layout               │
│                                               │
│  App Router  →  routes/screens                │
│  Drizzle + SQLite-WASM (OPFS)  →  SOURCE OF TRUTH │
│  Zustand  →  ephemeral UI state                │
│  TanStack Query  →  network calls only         │
│  Service worker  →  Web Push, offline shell    │
└───────────────┬───────────────────────────────┘
                │  HTTPS, only for AI + push
                ▼
┌─────────────────────────────────────────────┐
│  Next.js API routes (same deploy, or split)  │
│                                               │
│  • holds provider API keys                   │
│  • enforces per-user quota (free tier caps)   │
│  • retrieval over corpus + species data       │
│  • provider adapter: Gemini | Claude | ...    │
│  • sends Web Push notifications                │
│  • logs tokens, latency, cost per call         │
└─────────────────────────────────────────────┘
```

The app works completely without the server for everything except AI features and push delivery. Local reads/writes hit SQLite-in-the-browser. This is Principle 05 and it is also what keeps hosting cost near zero.

---

## Framework: Next.js (App Router), React 19

Chosen because it gives us the API routes needed for the AI proxy and Web Push backend in the same project (no separate server to stand up), first-class PWA support, and one deploy target (Vercel) with zero app-store review.

- Mobile-first responsive design: build for a phone-width viewport first, then adapt up. Desktop is not the design target but should not break.
- **PWA**: a web app manifest (`manifest.json`) with icons and `display: standalone`, plus a service worker for offline shell caching and Web Push. `next-pwa` or a hand-rolled service worker both work — verify current maintenance status of any plugin before adopting it, this ecosystem moves fast.
- No React Native, no Expo, no native build pipeline. Any spec or doc referencing Expo, EAS, `expo-*` packages, or App/Play Store submission is describing the old plan — treat as superseded unless explicitly reintroduced for a future native app.

---

## Routing

Next.js App Router, file-based, analogous to the old Expo Router structure — **corrected 2026-08-31, built in T-010**: the original sketch put both `(onboarding)` and `(tabs)` at bare `/`, which Next.js's App Router does not allow (two routes cannot resolve to the same path). Onboarding gets its own real segment instead; route groups are used only where they don't collide.

```
app/
  onboarding/
    page.tsx               stage picker: thinking / have one / emergency
    scan/page.tsx           camera capture
    report/page.tsx         the Tank Report, and tank creation
  (tabs)/                  route group — shares a layout with the bottom tab bar, owns "/"
    page.tsx                 tanks list
    dex/page.tsx              species Dex
    ask/page.tsx              Ask AquaAI
    settings/page.tsx
  tank/[id]/                outside (tabs) — full-screen, no bottom tab bar
    page.tsx                 tank overview
    log/page.tsx              parameters and graphs
    schedule/page.tsx         reminders and calendar
    journal/page.tsx
    livestock/page.tsx
  emergency/page.tsx        always reachable, never gated
  dev/components/page.tsx   every shared component in both themes, T-010
  api/
    scan/route.ts
    ask/route.ts
    triage/route.ts
    compat/route.ts
    species-gen/route.ts
    species-id/route.ts       single-fish photo ID, added when livestock ID was pulled out of /scan
    push/subscribe/route.ts
    push/send/route.ts        internal/cron only
```

A persistent bottom tab bar (mobile) matches the old five-tab layout: Tanks, Dex, Ask, Settings, plus the always-reachable Emergency entry point.

---

## Local database: SQLite-WASM + Drizzle ORM, persisted via OPFS

The browser equivalent of `expo-sqlite`. Real SQLite compiled to WebAssembly, not a different data model — this keeps the schema, query shape, and Drizzle usage nearly identical to the original native plan, and keeps the door open to a native app sharing the same schema later.

- **`wa-sqlite`** (or `sql.js` as a fallback) running against the **Origin Private File System (OPFS)** for actual persistent storage. OPFS is the part that makes this durable across reloads — plain in-memory `sql.js` without OPFS loses everything on refresh.
- Drizzle ORM with a SQLite driver targeting the WASM instance. Type-safe schema in TypeScript, same benefit as before: the compiler catches hallucinated column names.
- **No native live-query hook exists here the way `expo-sqlite`'s does.** Reactive re-rendering on write has to be built: either a small pub/sub layer that Zustand or a lightweight store subscribes to after every write, or a wrapper hook (`useLiveQuery`) that re-runs the query when a "the DB changed" signal fires. Keep it in one place (`src/db/live.ts`) rather than re-inventing it per screen.
- **Browser support check, before building anything else on this:** OPFS requires a secure context (HTTPS, or localhost in dev) and worker access to `createSyncAccessHandle` for the fast path. Confirm current support in the target browsers (Chrome/Edge on Android, Safari on iOS) at project start — Safari's OPFS support has historically lagged and changes across versions. If a browser cannot support it, the app must say so clearly rather than silently losing data; this is a harder requirement here than it ever was on native, where SQLite always worked.

### Migrations — the part that loses people's data

Same discipline as the native plan, adapted:

- `drizzle-kit generate` writes SQL migration files; apply them at app startup against the WASM database, gating queries on success — same shape as `useMigrations` did, just hand-rolled for this driver.
- **Test migration chains, not single migrations.** A user who has not opened the app in six months arrives three versions behind.
- **Never drop or rewrite a table holding user data without a copy-forward step.**
- **Export ships early (T-012) partly for this reason** — a user-facing trust feature and the migration safety net. It matters even more here: OPFS storage can be cleared by the browser under storage pressure or if the user clears site data, which has no native-app equivalent. Consider using the [Storage Manager API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API) to request persistent storage (`navigator.storage.persist()`) so the browser is less likely to evict it, and be explicit in-app that "clear browsing data" can wipe the tank log if they haven't exported.

---

## State: three layers, no overlap

The rule is unchanged from the native plan:

> **SQLite (WASM) is the source of truth. Zustand is UI state. TanStack Query wraps network calls only.**

- The live-query layer described above for anything stored locally. Do not wrap local data in TanStack Query — two caches that drift.
- **Zustand** for ephemeral UI state only: selected tank, active filter, onboarding step. Anything that must survive a reload belongs in SQLite.
- **TanStack Query** only for genuinely remote asynchronous work — AI calls, push subscription registration.

---

## Camera: browser file input

`<input type="file" accept="image/*" capture="environment">` opens the phone's native camera (or photo library, user's choice) directly from the browser, with zero native code and zero permission-prompt engineering beyond what the browser already handles.

- Images are downscaled to roughly 1024px on the longest edge client-side (Canvas API) before upload, same reasoning as before — image token cost scales with resolution and a 12MP photo buys no accuracy for "what is wrong with this fish."
- No native `getPendingResultAsync()`-style recovery problem exists here — the browser's file input either returns a file or it doesn't; there is no separate app-kill-during-capture case to handle.
- A live in-browser viewfinder (`getUserMedia`) was considered and rejected for v1: more code, inconsistent behaviour across mobile browsers, and the file input already gets a usable photo with the OS's own camera UI, which most users already know how to use.

---

## Notifications: Web Push

Reminders are still core to the product; the risk profile changes but does not disappear.

**The good news, compared to native:** there is no OEM battery-killer problem, no `USE_EXACT_ALARM` policy risk, no store-rejection exposure. Web Push is a W3C standard and works consistently within each platform's own rules.

**The real constraints, in order of severity:**

| Constraint | Consequence | What we do |
|---|---|---|
| iOS Safari requires the PWA to be **installed** (Add to Home Screen) for push to work at all, iOS 16.4+ only | No push for anyone who just visits the site in a browser tab | Prompt to install after a real moment of value (post first Tank Scan, not on page load); explain why; keep the in-app task list useful regardless |
| Browser notification permission can be declined or later revoked in OS settings | Silent non-delivery | Explain before requesting; diagnostics screen to check current state |
| A push subscription can go stale (uninstall, browser data clear, OS-level revoke) | Sends fail silently server-side | Handle send failures by pruning dead subscriptions; re-prompt on next visit if none are active |
| No server-side "wake the app" for scheduling — pushes must be sent *from the backend* at the right time | Need a scheduler, not just an endpoint | A cron-triggered API route (e.g. Vercel Cron, or an external scheduler) that queries due tasks and sends pushes, rather than the client scheduling anything locally |

**Scheduling pattern:** unlike the native rolling-notification-window trick (which existed to work around Android's local-scheduling quirks), Web Push is naturally **server-driven** — a scheduled job checks what's due and sends. This is simpler to reason about, not harder. Build one cron job that runs at least hourly, queries `tasks` due in the current window per user, and sends a push per due task.

**Diagnostics screen, still required, same reasoning as before:** notification permission state, push subscription registered (yes/no, per device), and a "send a test reminder in 60 seconds" button — because a reminder that silently never arrives is worse than no reminders feature, on web exactly as much as it was on native.

**Testing:** must happen on a real installed PWA on both an Android phone (Chrome) and an iPhone (Safari, 16.4+, installed) — desktop Chrome dev tools do not reproduce the installed-PWA requirement on iOS.

---

## AI layer

### Provider adapter

Unchanged in shape from the native plan — all model calls go through one interface so the provider is a one-file change:

```ts
interface ModelProvider {
  name: string
  analyseImage(input: { image: Buffer; prompt: string; schema: JSONSchema }): Promise<StructuredResult>
  answer(input: { messages: Message[]; grounding: CorpusChunk[]; schema: JSONSchema }): Promise<StructuredResult>
}
```

**Default: Gemini 3.5 Flash-Lite** at $0.10 / $0.40 per million tokens in/out, vision included — cheapest verified vision-capable model, not flagged as promotional.

**Second implementation: Claude Haiku 4.5** ($1.00 / $5.00), worth having available for the emergency triage flow where hedged, careful reasoning matters more than cost.

Two pricing traps unchanged from before: Gemini 3.6/3.7 Flash double in price on 1 January 2027, and the Gemini free tier trains on submitted data — never use it for a real user's photo.

### Cost control, built in from day one

- Downscale images to ~1024px longest edge client-side before upload.
- Cap output tokens explicitly on every call.
- Per-user rate limiting (keyed on a browser-generated anonymous id stored locally, since there are no accounts) — doubles as the free/paid boundary.
- Cache aggressively by prompt hash.
- Cheap classifier first: full tank vs. one fish vs. plant vs. test strip vs. something else; route and escalate only when needed.
- Log token counts, latency and cost per call from day one.

### Server: Next.js API routes

Runs in the same Next.js deploy as the app (Vercel functions under the hood), which is simpler than standing up a separate Cloudflare Worker — one deploy, one place to look at logs. Split it into its own service later only if traffic or cold-start latency demands it. Responsibilities are unchanged: hold provider keys, enforce quota, run retrieval over the corpus and species data, call the provider, validate the response against the schema before returning it, log usage. If the model returns JSON that fails schema validation, retry once, then return a structured "I could not analyse this."

Prompts live in versioned files (`prompts/tank-scan.v1.md`), not inline in code — unchanged.

Bring-your-own-key mode was planned here but never got a real UI (no screen ever let a user actually enter a key) — removed 2026-09-12 as dead code. See CLAUDE.md's AI rules for the current, simpler state: every call uses the server's own key.

---

## Monetization plumbing

**Stripe Checkout + Customer Portal**, not RevenueCat/native IAP. On the web there is no app-store-mandated payment system and no 15–30% platform cut — Stripe's own fee (~2–3%) applies instead. This is a meaningful cost advantage of the web pivot, worth stating plainly: Pro subscriptions keep far more of their revenue than they would through Play Billing or Apple IAP.

- Stripe Checkout for the initial subscribe flow (hosted page, handles India-specific payment methods — UPI, cards — natively, unlike native IAP which is card/store-wallet only).
- Stripe Customer Portal for self-serve plan management, cancellation, and invoices.
- Stripe webhooks (an API route) to update subscription status server-side — this becomes the new source of truth for "is this user Pro," queried by an anonymous device/browser id the same way AI quota is.
- No RevenueCat needed unless a future native app is built and cross-platform entitlement sync becomes valuable.

---

## Build and release

**Vercel** (or an equivalent Next.js host) — deploy on push to `main`, preview deploys per branch/PR, no app-store review process, no 14-day testing gate, no $25 developer account. This is the single biggest schedule win of the pivot: a finished feature can be live for users the same day, not four to six weeks later.

- Custom domain, HTTPS by default (required for OPFS, Web Push, and camera access — all three need a secure context).
- No target-API-level deadlines, no signing, no build queue.

`docs/06-shipping.md` is being rewritten to match — see that file for the new (much shorter) launch checklist.

---

## Open questions to resolve at project start

1. Current OPFS support matrix across Chrome/Edge (Android) and Safari (iOS) — confirm before committing further, and design the "unsupported browser" fallback message either way.
2. `wa-sqlite` vs `sql.js` — pick based on current maintenance activity and OPFS support quality at project start; this space moves fast.
3. Whether `next-pwa` (or a similar plugin) is current and well-maintained for the Next.js version in use, or whether a hand-rolled service worker is safer.
4. iOS Safari's current exact Web Push requirements (minimum iOS version, installed-PWA requirement) — confirm at project start, not from this document's date.
5. Whether Vercel Cron's free-tier invocation frequency is sufficient for timely reminder delivery, or whether an external scheduler (e.g. a cheap cron-as-a-service) is needed.
6. Gemini API free-tier availability from India, and OpenAI current vision pricing — same open questions as the native plan, unaffected by the pivot.
