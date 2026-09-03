# T-029 — Always-on shared server

**Phase 2 · Depends on: T-018 (the existing Web Push mirror is the template) · Size: unscoped — needs a decision session before estimating**

## Why this exists

CLAUDE.md's Principle 05 ("Works at the tank, offline") and the stack rules make SQLite-in-the-browser the source of truth for everything — deliberately, so the app never depends on a server to be useful. Reminders are the one narrow, already-approved exception (specs/T-018, specs/PROGRESS.md's 2026-09-01 decision): a small Redis-backed mirror exists purely because a server cron is the only way to send a push notification while a phone is asleep, and nothing else about a tank is duplicated there.

A second, similar gap showed up when building the Dex "All" tab's "suggest this fish for our catalog" flow (specs/PROGRESS.md, 2026-09-03 entry): the suggestion and its review screen (`/dev/species-suggestions`) are both local to one device's own SQLite. That is fine for solo testing on Jaideep's own phone, but it means a suggestion submitted from a real user's phone would never reach any screen Jaideep can see — there is no shared place for it to land. The same shape of problem will keep recurring anywhere the product needs one person (an admin, or another user) to see data that originated on someone else's device: species suggestions, any future community/sharing feature, cross-device sync, multi-reviewer workflows for the safety corpus, etc.

This task is to **decide on and stand up a proper always-on backend component** — not per-feature narrow mirrors bolted on ad hoc each time this comes up, but a real piece of shared server infrastructure the app can lean on going forward.

## Explicitly not decided yet — this spec is the placeholder for that conversation

Before any code: sit down with Jaideep and settle at least these questions. Do not silently pick defaults for a change this architecturally significant, per CLAUDE.md's "stop and ask at a genuine fork" rule.

- **What actually needs to live there first?** At minimum: species suggestions (already blocked on this). Possibly also: a shared/admin view of anything else currently local-only that a real multi-user product would need centrally — candidates to discuss, not a settled list.
- **Database choice.** Redis (already in use for reminders/quota, via Upstash) is fine for simple key-value/queue-shaped data but awkward for anything relational or queryable (e.g. "list all pending suggestions across all users, newest first" is exactly what the current `/dev/species-suggestions` does locally with SQL — Redis makes that harder). A real Postgres (Vercel Postgres / Neon / Supabase) is the more natural fit once there's more than one server-side shape of data. Decide once, don't accumulate two different server databases by accident.
- **Does this imply real accounts?** CLAUDE.md's "do not build accounts/cloud sync yet" rule and the 2026-09-01 decision to drop auth entirely are still in force. A shared backend does not have to mean login — device ids (already used for quota/push) may be enough for "which device submitted this," without a user ever signing in. Confirm this stays true before building anything that assumes identity.
- **Who reviews what, and where.** If `/dev/species-suggestions` moves server-side, does it stay a hidden URL Jaideep alone knows, or does it need real access control? Local-only currently means "only my own device can see my own data" as a free side effect — a shared backend loses that for free and needs a deliberate answer.
- **Cost and ops.** An always-on server component is a new operational dependency (uptime, backups, a bill) the project has avoided everywhere except the existing Redis usage. Worth being explicit that this is a real tradeoff being made, not just "add a database."

## Out of scope for this task

- Migrating anything that works fine locally today just because a server now exists — Principle 05 still applies to tank/livestock/measurement/photo data. This is additive infrastructure for the specific cases that need cross-device visibility, not a reversal of the offline-first architecture.
- Real accounts/login (see above) unless that conversation concludes it's actually needed.
- Building out species-suggestion review as a full server-backed feature — that's a separate, smaller follow-up once the backend itself exists and the decisions above are made.
