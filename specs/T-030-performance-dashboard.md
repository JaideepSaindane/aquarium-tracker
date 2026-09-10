# T-030 — App performance dashboard

**Phase 2 · Depends on: T-026 (local metrics), the 2026-09-10 accounts/Postgres backend · Size: needs scoping before estimating**

## Why this exists

T-026 built real metrics (active tanks, activation, logging retention, AI trust, 90-day survival) but they only ever render on a hidden per-device page (`/dev/metrics`) computed from that one device's own local SQLite rows. That was fine when there was no server and no way to see across users. Now that real accounts exist and tanks/livestock/measurements/profile live in a shared Postgres database (specs/PROGRESS.md's 2026-09-10 accounts entry), Jaideep asked for a real dashboard to track how the app is actually doing across all real users — something usable for "is this thing working," not just a debug page for one phone.

## Explicitly not decided yet — this spec is the placeholder for that conversation

Before any code, settle these with Jaideep — this is architecturally similar to T-029's "needs a decision session" framing, not a build-it-and-see task:

- **Which metrics matter for a launch-stage app?** Candidates: signups over time, daily/weekly active accounts, tanks created, scans run, Ask AquaAI questions asked, AI cost (token counts are already logged per CLAUDE.md's AI rules — this is the first real use for that data), retention/survival metrics from T-026 aggregated across accounts instead of one device, error rates on the AI routes. Don't build all of these speculatively — pick a first real set.
- **Where does it live and who can see it?** A hidden authenticated route in the app itself (matching the existing `/dev/*` pattern, but now needs real access control since it would show real user data, not just one device's own) vs. a separate internal tool vs. a third-party dashboard (e.g. pointed at the Postgres database directly). Real user data crossing into a dashboard is the first time this app needs an actual admin/owner permission concept — there isn't one today.
- **What data is server-side vs. still local-only.** Only tanks/livestock/measurements/profile are in Postgres today (2026-09-10 entry) — 13 other tables (scans, ai_interactions, journal, photos, etc.) are still local SQLite/OPFS only and invisible to any server-side dashboard until they're migrated. A metric like "AI trust" (thumbs up/down on `ai_interactions`) can't be computed centrally yet without moving that table server-side first — that may itself be a prerequisite task, not something this spec can route around.
- **Privacy.** Aggregate/anonymous counts (signups, active accounts) are a different privacy question than anything that lets Jaideep browse an individual user's tank data — CLAUDE.md's "their data is theirs" principle and the not-yet-written privacy policy both bear on this. Decide what the dashboard is allowed to show before building it.

## Out of scope for this task

- Migrating additional local-only tables to Postgres purely to feed this dashboard — that's real, separate work with its own risk (see the 2026-09-10 entry's "deliberately deferred" list) and should be scoped on its own merits, not smuggled in here.
- Building a general-purpose admin panel for editing user data — this is a read-only reporting surface, not a support/moderation tool.
- Real-time/live dashboards — a page that's accurate as of the last few minutes/hours is enough at this stage; don't over-engineer for a scale this app doesn't have yet.
