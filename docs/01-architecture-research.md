# 01 — Architecture Research: Expo Stack + AI Provider Pricing

**Research date:** 30 August 2026. All npm versions read live from `registry.npmjs.org` on this date.
**Status:** raw findings for merge into the architecture doc. Facts + sources, not narrative.
**Confidence key:** ✅ verified from primary source · ⚠️ verified from secondary source only · ❓ unverified — check before relying on it

---

## 1. Expo SDK — current state

### 1.1 Version timeline (✅ verified)

| SDK | Released | React Native | React | Notes |
|---|---|---|---|---|
| 55 | 2026-02-25 | 0.83 | 19.2 | **Legacy Architecture dropped.** `newArchEnabled` config option removed. Expo Router v7. |
| 56 | 2026-05-20 | 0.85 | 19.2 | Hermes v1 by default. Expo Router **no longer depends on `react-navigation`** (breaking; codemod provided). Expo UI (SwiftUI / Jetpack Compose) production-ready. Precompiled modules → faster builds. |
| **57 (current)** | **2026-06-30** | **0.86** | **19.2** | Edge-to-edge fixes on Android, RN DevTools light/dark emulation. Positioned as an "optional upgrade" — non-breaking. |

- Latest `expo` npm release: **57.0.18**, published 2026-08-28. Source: npm registry (`registry.npmjs.org/expo`).
- SDK 57 changelog: https://expo.dev/changelog/sdk-57
- SDK 56 changelog: https://expo.dev/changelog/sdk-56
- SDK 55 changelog: https://expo.dev/changelog/sdk-55

**Note on cadence:** Expo has moved to shipping "optional upgrades" for non-breaking React Native releases. SDK 57's own changelog says the upgrade is `npx expo install expo@latest --fix`. Treat SDK 57 as the target; do not chase SDK 58 betas.

**Version mismatch to be aware of:** npm's latest `react-native` is **0.87.1**, but SDK 57 pins **0.86**. Always install via `npx expo install <pkg>`, never `npm install <pkg>` — Expo resolves the SDK-compatible version. This is the single most common cause of "it built yesterday and not today" for non-coders.

### 1.2 New Architecture (✅ verified)

**The New Architecture is not optional any more — it is the only architecture.** SDK 54 was the last release to carry Legacy Architecture support; SDK 55 removed it and deleted the `newArchEnabled` flag. Source: https://expo.dev/changelog/sdk-55

Practical consequence: **any React Native library that has not been updated for the New Architecture will not work.** This is the main library-compatibility risk. Before adopting any third-party native package, check its repo for New Architecture / Fabric / TurboModules support. Expo's own modules (`expo-*`) are all fine.

Reference: https://docs.expo.dev/guides/new-architecture/

### 1.3 Minimum platform versions (⚠️ from SDK 55 changelog)

- Minimum iOS: **15.1**
- Android: **edge-to-edge display is mandatory** (Android 15+ enforces it; Expo streamlined it). Source: https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android
- Native iOS compilation requires **Xcode 26** — irrelevant if using EAS Build (cloud), relevant only for local builds.

---

## 2. Navigation — Expo Router (✅ verified)

**Expo Router is the recommended navigation approach.** Expo's docs state plainly: *"if you are building a new app, we recommend using Expo Router."* Source: https://docs.expo.dev/router/introduction/

- Current npm version: **`expo-router` 57.0.17**
- File-based routing: files in `app/` become routes automatically. Gives typed routes + automatic deep linking for free.
- It is **pre-installed in the default template**: `npx create-expo-app@latest --template default@sdk-57`

**Breaking change to know about (SDK 56):** Expo Router no longer depends on `react-navigation`. Code importing from `@react-navigation/*` previously worked implicitly; it now does not. Expo shipped a codemod. Source: https://expo.dev/changelog/sdk-56

⚠️ **Implication for Claude Code-generated code:** a lot of tutorial/StackOverflow React Native navigation code on the internet is `@react-navigation/native` code. Generated code that imports from `@react-navigation/*` is a red flag on SDK 56+. Pin the project to Expo Router idioms explicitly in project instructions.

---

## 3. Local-first database

### 3.1 Recommendation: `expo-sqlite` + Drizzle ORM

**Verified current versions (npm, 2026-08-30):**
- `expo-sqlite` — **57.0.2**
- `drizzle-orm` — **0.45.2**
- `drizzle-kit` — **0.31.10**

⚠️ **Discrepancy flagged:** Drizzle's official Expo getting-started page (https://orm.drizzle.team/docs/get-started/expo-new) currently instructs installing `drizzle-orm@rc` and `drizzle-kit@rc` (release-candidate tags), while the npm `latest` tags are 0.45.2 / 0.31.10. Resolve this at build time by checking what `@rc` actually resolves to; do not blindly pin either. Drizzle is still pre-1.0, so treat minor bumps as potentially breaking.

**Why this path (⚠️ secondary source, but consistent across sources):** a 2026 offline-first survey recommends it as the default — *"Use `expo-sqlite` + Drizzle ORM. It's the smoothest path with excellent type safety and live queries."* Source: https://reactnativerelay.com/article/building-offline-first-react-native-apps-2026-expo-sqlite-drizzle-orm-sync-strategies

Advantages relevant to this project:
- Zero native build config — it is an Expo module, works in Expo Go for basic use.
- Type-safe schema in TypeScript, which is disproportionately valuable when an AI writes the code (the compiler catches hallucinated column names).
- **Live queries** — reactive queries that re-render on write. Removes the need for a separate cache layer for local data.
- SDK 55 added a **SQLite Inspector DevTools plugin** (browse the DB in real time) and a tagged-template-literal API for safe parameterised SQL. Source: https://expo.dev/changelog/sdk-55
- SDK 56 added native `ArrayBuffer` for blob columns, statement bind parameters, and **session changesets** (useful later if sync is added). Source: https://expo.dev/changelog/sdk-56

### 3.2 Migration setup (✅ from Drizzle docs)

Three moving parts, all required:
1. `npx drizzle-kit generate` → writes SQL migration files into `drizzle/`
2. Babel config gets the inline-import plugin so `.sql` files can be bundled: `["inline-import", { "extensions": [".sql"] }]`; Metro config must also recognise `.sql`
3. The `useMigrations` hook applies pending migrations at app startup, inside a React component, gating queries on success

`drizzle.config.ts` uses `dialect: 'sqlite'`, `driver: 'expo'`. Connection: `SQLite.openDatabaseSync('db.db')` passed to `drizzle()`.
Source: https://orm.drizzle.team/docs/get-started/expo-new

### 3.3 Migration gotchas (⚠️ secondary)

These are the ones that bite in production, per the offline-first guide:
- **Migration chains, not single migrations.** A user who hasn't opened the app in six months arrives three migrations behind. The whole chain must run cleanly in order. Test v1→v4 directly, not just v3→v4.
- **Destructive migrations vs unsynced local data.** If a table is altered while it holds data the user has not backed up anywhere, that data can be lost. For a local-only app this means: never `DROP`/rewrite a table without a copy-forward step.
- SQLite's `ALTER TABLE` is limited (no drop-column on old versions, no type changes). Drizzle generates the create-copy-drop-rename dance, but review it.
- **Practical mitigation:** ship an "export my data to JSON/CSV" feature early. It is a user feature *and* your migration safety net.

Source: https://reactnativerelay.com/article/building-offline-first-react-native-apps-2026-expo-sqlite-drizzle-orm-sync-strategies

### 3.4 Alternatives considered

| Option | npm latest (2026-08-30) | Verdict |
|---|---|---|
| **`expo-sqlite` + Drizzle** | 57.0.2 / 0.45.2 | **Chosen.** Best DX, no native config, live queries, Expo-maintained. |
| `@op-engineering/op-sqlite` | **18.1.4** | Faster raw queries (JSI-based). Requires a native build, **cannot run in Expo Go**. Worth it only for data-intensive workloads. An aquarium log is not that. |
| `@nozbe/watermelondb` | **0.28.0** | Built-in sync engine + lazy loading, good for very large relational datasets. Steeper learning curve; still pre-1.0 after many years; heavier for an AI to write correctly. Skip. |

Comparison source: https://reactnativerelay.com/article/building-offline-first-react-native-apps-2026-expo-sqlite-drizzle-orm-sync-strategies

❓ **Unverified as of Aug 2026:** whether `op-sqlite` 18.x fully supports the New Architecture on SDK 57 — check the repo's compatibility table before considering it. Not on the critical path for this project.

---

## 4. Camera and photos

**Verified current versions:**
- `expo-camera` — **57.0.4**
- `expo-image-picker` — **57.0.14**
- `expo-image` — **57.0.3** (use for rendering; it is the fast, cached image component)
- `expo-file-system` — **57.0.6**

### 4.1 `expo-camera` — high-res capture limitation (⚠️ secondary source, important)

**This is a real constraint.** A 2026 comparison guide states `expo-camera` *"does not expose codec selection or resolution beyond what the platform provides by default"* and marks **4K / HDR as unsupported**. `react-native-vision-camera` by contrast lets you pick exact resolution, frame rate and codec.

Source: https://www.pkgpulse.com/guides/react-native-vision-camera-vs-expo-camera-vs-expo-image-2026

**What this means for an aquarium app:** photographing a tank/fish for AI analysis or for a photo journal is a *standard* use case — the same guide notes *"standard use cases like profile picture uploads work adequately with Expo Camera."* You do not need 4K for a vision model; you will downscale to ~1024px before sending anyway (see §7.4). **Recommendation: use `expo-camera`, do not adopt VisionCamera.** VisionCamera adds native-build complexity and New-Architecture compatibility risk for a benefit this app does not need.

SDK 55 additions to `expo-camera`: video stabilisation, screen flash for front cameras on Android, and an option to exclude the barcode-scanner APIs to shrink app size. Source: https://expo.dev/changelog/sdk-55

### 4.2 `expo-image-picker` — API and known issues (✅ from Expo docs)

Main API:
- `launchCameraAsync(options)` / `launchImageLibraryAsync(options)`
- `getPendingResultAsync()` — **Android only, and non-obvious: recovers a result when Android killed your app while the camera was open.** Low-memory Android devices do this. Must be handled or users lose photos.

Key options: `mediaTypes` (`'images' | 'videos' | 'livePhotos'`), `quality` (0–1, default 1.0), `allowsEditing`, `allowsMultipleSelection`, `aspect` (`[x,y]`, **Android only**), `base64`.

Documented limitations:
- **iOS:** cropping a high-resolution image from the camera roll returns a wrong crop rectangle in some cases (upstream `UIImagePickerController` bug).
- **Android:** GIF animation is preserved only when `quality === 1.0` **and** `allowsEditing === false`.

Permissions are configured through the config plugin in `app.json`:
```json
["expo-image-picker", {
  "photosPermission": "...",
  "cameraPermission": "...",
  "microphonePermission": "..."
}]
```
`CAMERA` and media-library permissions must still be requested at runtime.

Source: https://docs.expo.dev/versions/latest/sdk/imagepicker/

---

## 5. `expo-notifications` — CRITICAL SECTION

Current version: **`expo-notifications` 57.0.15** (npm, 2026-08-30).

### 5.1 Does it work in Expo Go? (✅ verified from Expo docs)

| | Local scheduled notifications | Remote push |
|---|---|---|
| **Expo Go — Android** | ✅ **Works** | ❌ Removed since SDK 53; requires a development build |
| **Expo Go — iOS** | ✅ Works | ✅ Works |
| **Development build (both)** | ✅ Works | ✅ Works |

Expo's docs, verbatim: *"Push notifications (remote notifications) functionality provided by `expo-notifications` is unavailable in Expo Go on Android from SDK 53… **Local notifications (in-app notifications) remain available in Expo Go.**"*
Sources: https://docs.expo.dev/versions/latest/sdk/notifications/ and https://github.com/expo/expo/blob/main/docs/pages/versions/unversioned/sdk/notifications.mdx

**Verdict for this project: the reminders feature is NOT blocked.** Because reminders are local-only (no push server), the feature is buildable and even testable in Expo Go. **But see §5.4 — Expo Go is not a valid test of reliability.**

### 5.2 Supported trigger types (✅ from Expo docs)

| Trigger | Platforms | Notes |
|---|---|---|
| `TIME_INTERVAL` | Android, iOS | Supports `repeats: true`. Fires N seconds out. |
| `DATE` | Android, iOS | One-shot at a specific timestamp. |
| `CALENDAR` | **iOS only** | Calendar-component matching. |
| `DAILY` / `WEEKLY` | ❓ **Not explicitly documented in the section reviewed** — verify against the SDK 57 docs and the TypeScript types (`SchedulableTriggerInputTypes`) before designing around them. |

Source: https://docs.expo.dev/versions/latest/sdk/notifications/

**Design implication:** the safest, most portable pattern for recurring reminders is **not** to rely on a repeating trigger. Instead:
> Schedule a rolling window of individual `DATE` notifications (e.g. the next 30–60 occurrences), and top the window up every time the app opens.

This is more code but it is what survives OS-level repeat quirks, timezone changes, DST, and user edits to a schedule. It also gives exact control over the notification body per occurrence ("Water change due for *Reef Tank*"). Recommend this explicitly to Claude Code.

### 5.3 Android permissions (✅ from Expo + Android docs)

| Permission | When needed | How it's granted |
|---|---|---|
| `RECEIVE_BOOT_COMPLETED` | Always | Added automatically by `expo-notifications`. Re-registers scheduled notifications after a reboot — **without it, every reminder dies on restart.** |
| `POST_NOTIFICATIONS` | Android 13+ (API 33+) | Runtime prompt. **The user can say no**, and then nothing you schedule will ever be seen. Must request it and handle refusal. |
| `SCHEDULE_EXACT_ALARM` | Android 12+ (API 31+), for exact-time firing | Must be added manually to the manifest. **NOT pre-granted on fresh installs of apps targeting API 33+.** User-revocable. Check `canScheduleExactAlarms()` before scheduling. |
| `USE_EXACT_ALARM` | Android 13+ | Auto-granted, non-revocable — **but Play-policy restricted, see below.** |

Sources: https://docs.expo.dev/versions/latest/sdk/notifications/ · https://developer.android.com/develop/background-work/services/alarms

### 5.4 ⚠️ THE BIG ONE: `USE_EXACT_ALARM` is Play-policy restricted

Google Play policy, verbatim: *"USE_EXACT_ALARM is a restricted permission and apps must only declare this permission if their core functionality supports the need for an exact alarm."* Eligible categories are **alarm/timer apps** and **calendar apps that show event notifications** — and nothing else. The policy adds: *"If you have a use case for exact alarm functionality that's not covered above, you should evaluate if using SCHEDULE_EXACT_ALARM as an alternative is an option."*

Source: https://support.google.com/googleplay/android-developer/answer/16558241

**An aquarium maintenance-reminder app is very unlikely to qualify as an "alarm or timer app."** Declaring `USE_EXACT_ALARM` is a plausible rejection / policy-flag route. **Do not declare it.**

**Recommended approach:**
1. Declare **`SCHEDULE_EXACT_ALARM`** only (user-grantable, broader use cases explicitly allowed).
2. At runtime call `canScheduleExactAlarms()`. If false, show a short in-app explainer and deep-link the user to the system setting.
3. **Fall back gracefully to inexact alarms** if the user declines. A water-change reminder that arrives at 9:14 instead of 9:00 is fine; a reminder that never arrives is not.
4. Listen for `ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED` to reschedule if the permission is later granted or revoked.

### 5.5 Doze mode and OEM battery killers (✅ Android docs; ⚠️ OEM behaviour)

From Android's own documentation: **"Alarms don't fire when the device is in Doze mode"** — they are deferred until the device exits Doze. Options that survive Doze: an exact alarm, `setAndAllowWhileIdle()` for inexact alarms, or WorkManager expedited work. `setInexactRepeating()` is batched across apps to save battery and also respects Doze deferral.

Source: https://developer.android.com/develop/background-work/services/alarms

⚠️ **Additionally, and not covered by any official doc:** Chinese-market OEM skins (Xiaomi/MIUI, OPPO/ColorOS, Vivo/FuntouchOS, Realme, and to a lesser degree Samsung OneUI and OnePlus) aggressively kill background apps and their alarms unless the user manually enables "Autostart" and sets battery usage to "Unrestricted". **This is the single largest practical reliability risk for the reminders feature, and it is disproportionately relevant to an India-first launch, where those OEMs dominate.**

**Required mitigations (build these, they are not optional):**
- An in-app "Are my reminders working?" diagnostics screen: notification permission state, exact-alarm permission state, and a "send a test reminder in 60 seconds" button.
- A one-time onboarding card instructing the user to disable battery optimisation for the app, with a deep link to the OEM setting where possible.
- A visible in-app task list, so the app still works as a to-do list even when a notification is swallowed.

❓ **Unverified as of Aug 2026:** exact current behaviour of each OEM skin's autostart manager. Check https://dontkillmyapp.com for per-OEM instructions at build time, and consider linking users there.

### 5.6 Bottom line for the reminders feature

**The feature is viable but is the highest-risk part of the app.** It does not require a push server, does not require paid infrastructure, and does work in Expo Go for basic development. It will *not* be reliable-by-default on Android, and reliability must be engineered (rolling `DATE` windows, `SCHEDULE_EXACT_ALARM` with graceful fallback, boot re-registration, battery-optimisation onboarding, in-app diagnostics). Budget real development and real on-device testing time for it. **It must be tested on a physical Android phone — Expo Go, emulators and the iOS simulator do not reproduce Doze or OEM kill behaviour.**

---

## 6. Build, deploy, monetisation infrastructure

### 6.1 EAS Build + EAS Update pricing (✅ from expo.dev/pricing and docs.expo.dev/billing/plans)

| Plan | Price/month | EAS Build (included) | Concurrency | EAS Update MAU | Bandwidth / storage |
|---|---|---|---|---|---|
| **Free** | **$0** | **15 Android + 15 iOS builds/mo**, low priority | 1 | **1,000 MAU** | 100 GiB / 20 GiB |
| Starter | **$19** | $45 of build credit (priority builds) | 1 (+$50 each, max 5 extra) | 3,000 then usage-based | overage $0.10/GiB bandwidth, $0.05/GiB storage |
| Production | **$199** | $225 of build credit | +$50 per extra concurrency | 50,000 then usage-based | + end-to-end code signing |
| Enterprise | custom | — | — | 1,000,000 then usage-based | — |

Sources: https://expo.dev/pricing · https://docs.expo.dev/billing/plans/

- **EAS Submit** (uploading builds to Play/App Store) is **included in all tiers including Free** — it is not separately priced.
- **MAU definition (✅ from Expo):** *"someone who downloads at least one update during the billing period"* — repeat downloads by the same user count once. So 1,000 free MAU means 1,000 users who actually received an OTA update that month.
- **Free-tier catch:** free builds are explicitly **low priority**, i.e. queued behind paying customers. Source: https://github.com/expo/fyi/blob/main/eas-build-queues.md
- ❓ **Unverified:** the exact dollar cost of a single overage build beyond the included credit. The pricing page shows credit amounts, not per-build rates. Check https://expo.dev/pricing before budgeting build overages.

**Assessment:** 15+15 builds/month on the free tier is genuinely enough for a solo developer through the entire pre-launch phase, *if* development is done against a local dev build and OTA updates rather than rebuilding for every change. Budget one month of Starter ($19) around launch week when rebuild frequency spikes and queue latency hurts.

### 6.2 RevenueCat (✅ from revenuecat.com)

- **Free up to $2,500 monthly tracked revenue (MTR).** Above that: **1% of tracked revenue.** All features included in the free tier. Enterprise pricing is custom.
  Source: https://www.revenuecat.com/pricing/
- Integration: install **`react-native-purchases`** (npm latest **10.8.1**, 2026-08-30) plus `react-native-purchases-ui` for prebuilt paywalls.
- **Requires a development build.** RevenueCat's own Expo guide: *"To use and test RevenueCat with Expo, you'll need to create an Expo development build."* Expo Go only offers a Preview API Mode with mocked functionality.
  Source: https://www.revenuecat.com/docs/getting-started/installation/expo
- ❓ **Unverified:** minimum supported Expo SDK for `react-native-purchases` 10.x, and whether a config plugin step is required on SDK 57 — RevenueCat's Expo page does not state either. Check the package's GitHub releases before wiring it up.

**Assessment:** at $2,500 MTR free, RevenueCat costs nothing until the app is earning roughly ₹2.4 lakh/month. Use it. Writing StoreKit/Play Billing receipt validation by hand is not a reasonable task for an AI-written first app.

### 6.3 Recommended package list (versions verified on npm, 2026-08-30)

Install everything with `npx expo install`, not `npm install`.

**Core (from the SDK-57 default template):**
| Package | Version |
|---|---|
| `expo` | 57.0.18 |
| `react-native` | 0.86 (SDK-pinned; npm latest is 0.87.1 — **use the pinned one**) |
| `react` | 19.2.x |
| `expo-router` | 57.0.17 |
| `react-native-safe-area-context` | 5.9.1 |
| `react-native-screens` | 4.27.0 |
| `react-native-reanimated` | 4.6.0 (SDK 57 bundles 4.5 — let `expo install` decide) |

**Data:**
| Package | Version | Purpose |
|---|---|---|
| `expo-sqlite` | 57.0.2 | local database |
| `drizzle-orm` | 0.45.2 ⚠️ (docs say `@rc`) | type-safe queries + live queries |
| `drizzle-kit` | 0.31.10 ⚠️ | migration generation (dev dependency) |
| `babel-plugin-inline-import` | ❓ not version-checked | bundles `.sql` migration files |

**Device features:**
| Package | Version |
|---|---|
| `expo-notifications` | 57.0.15 |
| `expo-camera` | 57.0.4 |
| `expo-image-picker` | 57.0.14 |
| `expo-image` | 57.0.3 |
| `expo-file-system` | 57.0.6 |
| `expo-secure-store` | 57.0.2 (for the AI API key if one is stored on-device) |

**Build / release:**
| Package | Version |
|---|---|
| `eas-cli` | **23.0.0** (install globally or use `npx eas-cli@latest`) |
| `expo-dev-client` | 57.0.16 |
| `expo-updates` | 57.0.19 |
| `expo-build-properties` | 57.0.15 (needed to set Android manifest properties) |

**State / UI / monetisation:**
| Package | Version | Purpose |
|---|---|---|
| `zustand` | 5.0.15 | client state |
| `@tanstack/react-query` | 5.102.8 | server/AI-call state (see §6.4) |
| `nativewind` | 4.2.6 | Tailwind-style styling ❓ verify SDK 57 / RN 0.86 compatibility before adopting |
| `react-native-mmkv` | 4.3.2 | fast key-value store for settings ❓ verify New Architecture support |
| `react-native-purchases` | 10.8.1 | RevenueCat |

⚠️ All non-`expo-*` packages carry New-Architecture compatibility risk (§1.2). Verify each one's repo before adding it. `nativewind` and `react-native-mmkv` in particular should be checked, not assumed.

### 6.4 State management and data fetching (⚠️ secondary sources, but consensus)

The 2026 consensus pairing for Expo is **Zustand for client state + TanStack Query for asynchronous/server state**. Redux Toolkit remains viable but is more ceremony than a solo project needs; Jotai is the atomic alternative.
Sources: https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query · https://ncctcr.com/blog/react-state-management-2026

**Project-specific adjustment — this matters:**
- **Do NOT use TanStack Query as the cache for local SQLite data.** Drizzle's **live queries** already give reactive re-rendering on write, and layering a query cache over a local database creates two sources of truth that drift. This is a very common AI-generated-code mistake.
- **Use TanStack Query only for genuinely remote, asynchronous work** — i.e. calls to the AI vision provider. Its retry, caching and loading-state handling are worth having there.
- **Use Zustand only for ephemeral UI state** — selected tank, active filters, onboarding step. Anything that must survive an app restart belongs in SQLite, not Zustand.

Net rule to give Claude Code: *SQLite is the source of truth; Zustand is UI state; TanStack Query wraps network calls only.*

---

## 7. AI provider pricing (verified 2026-08-30)

### 7.1 Google Gemini (✅ from ai.google.dev/gemini-api/docs/pricing)

Per 1M tokens, paid standard tier. All listed models accept image input.

| Model | Input | Output |
|---|---|---|
| **Gemini 2.5 Flash-Lite** | **$0.10** (text/image/video); $0.30 audio | **$0.40** |
| Gemini 2.5 Flash | $0.30 (text/image/video); $1.00 audio | $2.50 |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 |
| Gemini 3.5 Flash | $1.50 | $9.00 |
| Gemini 3.6 Flash | $0.75 → **$1.50 from 1 Jan 2027** | $3.75 → **$7.50 from 1 Jan 2027** |
| Gemini 3.7 Flash | $0.75 → **$1.50 from 1 Jan 2027** | $3.75 → **$7.50 from 1 Jan 2027** |
| Gemini 2.5 Pro | $1.25 (≤200k ctx) / $2.50 (>200k) | $10.00 / $15.00 |

**Batch API halves input and output prices across all models.**

⚠️ **Scheduled price increase — plan for it.** Gemini 3.6/3.7 Flash **double in price on 1 January 2027**. If unit economics are modelled on 3.7 Flash at $0.75/$3.75, they break in four months. Model against the post-increase price, or use 2.5 Flash-Lite whose price is not marked as promotional.

### 7.2 Anthropic Claude (✅ from platform.claude.com/docs/en/about-claude/pricing)

Per 1M tokens. **All current models support vision.**

| Model | Input | Output |
|---|---|---|
| **Claude Haiku 4.5** | **$1.00** | **$5.00** |
| Claude Sonnet 5 | $2.00 | $10.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Opus 5 / 4.8 / 4.7 / 4.6 | $5.00 | $25.00 |

Multipliers stack: prompt caching 1.25× (5-min write) / 2× (1-hr write) / **0.1× on cache hit**; Batch API 0.5×; US-only data residency 1.1×.

⚠️ Two notes worth carrying forward:
- Sonnet 5's $2/$10 introductory pricing is stated as standard **through at least 31 August 2026** — i.e. it may change imminently. Re-check.
- **Claude 4.7+ uses a newer tokenizer producing ~30% more tokens for the same text** than Sonnet 4.6 and earlier. A like-for-like price comparison across those model generations understates the newer models' real cost by roughly a third.

### 7.3 OpenAI (⚠️ THIRD-PARTY SOURCES ONLY — sources disagree)

The official OpenAI pricing page could not be fetched during this research. Two third-party trackers were consulted and **they do not agree**, so treat all of the below as unverified.

From https://www.morphllm.com/openai-api-pricing (page states "last verified 21 August 2026"):

| Model | Input | Output |
|---|---|---|
| `gpt-5-nano` (legacy, still available) | **$0.05** | **$0.40** |
| `gpt-5-mini` (legacy) | $0.25 | $2.00 |
| GPT-5.4-nano | $0.20 | $1.25 |
| GPT-5.4-mini | $0.75 | $4.50 |
| gpt-5.6-luna | $0.20 | $1.20 |

From https://benchlm.ai/openai/api-pricing (August 2026): agrees the floor is $0.05/1M input (GPT-5 nano) but lists gpt-5.6-luna at **$1/$6**, contradicting the $0.20/$1.20 above.

❓ **Unverified as of Aug 2026 — check https://platform.openai.com/docs/pricing directly.** In particular: (a) which of the nano/mini models accept image input at all — neither source confirmed vision support per model — and (b) the true current price of the 5.6 line.

### 7.4 Free tiers useful for prototyping (⚠️ mixed)

- **Google AI Studio / Gemini API free tier** — the strongest option for prototyping. As of August 2026 free-priced models reportedly include `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`.
  ⚠️ **Three caveats:**
  1. **Free-tier data is used to train/improve Google products, and human reviewers may see it.** Never send real user photos through the free tier. Prototype only.
  2. Google no longer publishes fixed free-tier rate limits — its docs now direct developers to the AI Studio dashboard and state that published limits do not guarantee capacity. Source: https://ai.google.dev/gemini-api/docs/rate-limits
  3. Current terms reportedly require the **paid** service if your API client is made available to users in the **EEA, Switzerland or the UK**. Source: https://www.aifreeapi.com/en/posts/google-gemini-api-free-tier
  ❓ Free-tier availability specifically from India was not confirmed. Verify by generating a key at https://aistudio.google.com.
- Anthropic and OpenAI: no ongoing free tier verified for API use.

### 7.5 Recommendation

**Prototype on the Gemini free tier with synthetic/own photos; ship on Gemini 2.5 Flash-Lite ($0.10 in / $0.40 out, vision included).**

Rationale: it is the cheapest verified vision-capable model by a wide margin (10× cheaper input than Claude Haiku 4.5), its price is not flagged as promotional, and the paid tier removes the training-data concern. Keep the provider behind a thin interface so switching to Claude Haiku 4.5 (for quality) is a one-file change.

**Cost control regardless of provider — build these in from day one:**
- **Downscale images to ~1024px on the longest edge before upload.** Image token cost scales with resolution; a 12MP phone photo is enormously more expensive than a 1024px one, for no accuracy gain on "what is wrong with this fish."
- Cap output tokens explicitly on every call.
- Rate-limit per user (this is also the natural free-vs-paid boundary for the freemium tier).
- Use Batch API (50% off on both Gemini and Claude) for anything not user-facing-realtime.
- Log token counts per call from day one so unit economics are measurable, not guessed.

---

## 8. Open questions for the lead

1. `DAILY` / `WEEKLY` trigger support in `expo-notifications` 57.x — confirm from TypeScript types before designing the reminder scheduler. The rolling-`DATE`-window pattern (§5.2) is recommended regardless.
2. `drizzle-orm` version: `@rc` per docs vs `0.45.2` on npm `latest` — resolve at project init.
3. OpenAI pricing and per-model vision support — official page unfetched, third-party sources conflict.
4. New-Architecture compatibility of `nativewind` 4.2.6 and `react-native-mmkv` 4.3.2 on RN 0.86.
5. `react-native-purchases` 10.8.1 minimum Expo SDK and config-plugin requirement.
6. Gemini API free-tier availability from India.
7. Per-build overage cost on EAS beyond the included build credit.
