# T-018 — Reminders, calendar, Web Push reliability

**Phase 1 · Depends on: T-011 · Size: 3–4 days**

*Rewritten 2026-08-31 for the web pivot. Local OS notifications (`expo-notifications`) are replaced by Web Push, which needs a small backend component. The risk profile changes — no more OEM battery-killer battle — but a new hard constraint appears: iOS requires the PWA to be installed before push works at all.*

## Goal

Reminders that actually arrive, on the phones and browsers people actually use — with iOS's installed-PWA requirement handled honestly rather than silently failing.

## Why this is still worth taking seriously

Local push on the web is a real W3C standard, not a workaround, and does not have Android's Doze-mode or OEM battery-killer problems. But **iOS Safari only supports Web Push for a PWA that has been added to the Home Screen, and only from iOS 16.4 onward** — a user who just visits the site in a browser tab on their iPhone cannot get push notifications no matter what they grant. A reminders feature that silently fails for a large share of iPhone users is worse than no reminders feature, because people stop testing their water and blame the app when a fish dies.

Read `docs/01-architecture.md` § Notifications: Web Push before starting. All of it.

## In scope

**Reminder creation — learn from the incumbent's most common usability complaint.** Aquarium Log's scheduling UI defeated people who loved everything else about it:

> "The reminder setup is not intuitive and nothing worked for me. I'll just use Google Calendar instead." — Tony Culverwell

So: **six one-tap presets** with sensible defaults derived from the tank — water change, filter clean, dose, CO₂ refill, trim, test. Custom scheduling — any frequency, any interval — lives behind "more" and is not the default path. Tank Scan returns a `recommended_maintenance` array (see `docs/03-ai-contracts.md`) whose `preset_type` values map directly onto these six and onto `tasks.preset_type`.

- Per-tank and per-livestock reminders.
- A calendar view: what is due today, this week, overdue. Today's list shows **only what is actually due today** — another specific Aquarium Log complaint.
- Completing a task from the notification (via a click action) or the in-app list, and logging it in one action.

**Backend and delivery — none of this is optional:**

- **VAPID key pair**, generated once, stored as environment variables server-side.
- A `push_subscriptions` table: one row per browser/device that has granted permission, storing the subscription object the Push API gives you. A user with the app on two phones has two rows.
- `/api/push/subscribe` route to register a subscription; call it after the browser grants notification permission.
- **A scheduled job** (Vercel Cron or equivalent) running at least hourly, querying tasks due in the current window across all users, and sending a push per due task via `web-push` (or equivalent) using the stored subscriptions and VAPID keys.
- **Prune dead subscriptions**: when a send fails with a 404/410 from the push service, delete that subscription row — it means the user uninstalled, cleared data, or revoked permission at the OS level.
- **The install prompt**: a clear, honest, well-timed "Add AquaAI to your Home Screen to get reminders" moment — a good point is right after the first Tank Scan, when the user has already gotten value, not on first page load. On iOS this uses the browser's native "Add to Home Screen" flow (Safari's share sheet); on Android the app can trigger the native `beforeinstallprompt` prompt directly.
- Request notification permission with a plain-language explanation first, and keep the in-app task list fully useful if declined or unsupported.
- **"Are my reminders working?" diagnostics screen** in Settings: notification permission state, whether a push subscription is registered for this device, platform/browser detected (with a note if it's an iOS browser tab that hasn't been installed yet — the single most likely failure mode), and a "send a test reminder in 60 seconds" button that round-trips through the real backend.

## Out of scope

Native OS notifications (superseded by Web Push). Smart reminders that adapt to logged behaviour (Phase 2).

## Acceptance criteria

**Must be verified on real phone browsers — Android Chrome and iOS Safari — not just desktop.**

1. Creating a weekly water-change reminder takes three taps or fewer.
2. On Android Chrome (installed or not), granting notification permission and sending a test reminder for 60 seconds from now results in it arriving.
3. **On iOS Safari, before installing the PWA, the diagnostics screen correctly explains that push won't work yet and prompts installation** — it must not silently claim success.
4. On iOS Safari, after adding to Home Screen (iOS 16.4+) and granting notification permission, a test reminder arrives.
5. **A reminder set for tomorrow morning arrives tomorrow morning**, on both an installed Android and an installed iOS device, left untouched overnight.
6. Uninstalling the PWA (or clearing site data) and later reinstalling requires re-granting permission — verify old, dead subscriptions get pruned server-side rather than accumulating silently.
7. Editing a reminder's time results in the correct new time firing — no duplicate or stale notification.
8. Declining notification permission still leaves a usable in-app task list, with an explanation of what was lost.
9. The diagnostics screen correctly reports permission state, subscription registration, and platform-specific caveats, and the test button works end-to-end through the real backend.
10. Today's calendar view shows only what is due today.
11. Tapping/clicking a reminder notification marks the task done and logs it, or at minimum deep-links into the app to do so in one further tap.

## Notes for Claude Code

Criterion 5 takes a night to test, on two separate physical devices. Do not claim this task is complete until it has actually been observed on both. If Jaideep has not yet run the overnight test on both an Android and an iOS device, say the task is pending verification rather than done — mirror the honesty discipline the native plan had for the same reason.
