# T-031 — Full security review

**Phase 2 · Depends on: the 2026-09-10 accounts/Postgres backend · Size: needs scoping before estimating**

## Why this exists

Until 2026-09-10 this app had no accounts, no server-side user data, and no secrets worth protecting beyond a few AI provider API keys already kept server-side per CLAUDE.md's AI rules. That changed with real Google/phone+PIN sign-in and a shared Postgres database holding real user data (tanks, livestock, measurements, profile) across accounts. Jaideep asked for a full security review before this goes further toward a real launch — the risk surface is materially different now than when the original threat model (none) was implicitly fine.

## Known, already-flagged risk areas to start from

These are documented gaps already called out honestly in `specs/PROGRESS.md`'s 2026-09-10 accounts entry and `CLAUDE.md` — a real review should verify, quantify, and either accept-and-document or fix each one, not rediscover them from scratch:

- **Phone sign-in has no SMS verification, by Jaideep's explicit cost-driven choice.** A phone number is never confirmed to belong to whoever typed it. The only real key is a 4-digit PIN (10,000-combination keyspace) plus `src/server/auth/login-rate-limit.ts`'s 5-attempts/15-minutes lockout. Verify the lockout actually holds under a real brute-force attempt (not just code review), check it's per-phone-number and not bypassable (e.g. via IP rotation, or a race on concurrent requests), and confirm there's no timing side-channel leaking which phone numbers are already registered.
- **No forgot-PIN recovery flow exists.** Confirm what actually happens today if a real user is locked out — does support have any path to help them, or is an account genuinely unrecoverable?
- **Google OAuth client secret and other secrets in `.env.local`.** Confirm none of `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`, VAPID keys, etc. have ever leaked into a client bundle (T-013's proxy work already grepped `.next/static` for the Gemini key once — redo that sweep for every secret, not just that one) or into git history (the repo is public per the 2026-09-06 decision log entry — check `git log` for any commit that ever added a real secret, not just the current file state).
- **`src/proxy.ts` route gating.** Confirm every route that should require sign-in actually does, with no gap (a newly added page that forgets to check auth is the most likely regression path here), and that API routes enforce per-user data scoping server-side (a user can't read/write another account's tanks/livestock/measurements by guessing or tampering with an id) rather than trusting client-supplied ids.
- **AI proxy routes.** CLAUDE.md's AI rules already require provider keys to stay server-side — confirm quota/rate-limiting (T-013) can't be trivially bypassed now that requests are tied to real accounts instead of anonymous device ids, and that one user can't exhaust another's quota or run up API cost against someone else's account.
- **Standard web app surface**: SQL/query injection risk in the new Drizzle/Postgres routes (should be low if parameterized queries are used throughout, but verify, not assume), XSS in any user-supplied text that gets rendered back (tank names, journal entries, species suggestions, profile fields), CSRF on state-changing routes, and dependency vulnerabilities (`npm audit` — T-011's entry already flagged one known dev-only `esbuild` issue; check for anything new, especially in `next-auth`/Drizzle/Postgres-adjacent packages).

## Explicitly not decided yet

- **Who does this review** — an external security audit, a structured self-review using a tool like the `security-review` skill already available in this environment, or both. Given the phone+PIN design is a deliberate, accepted-risk simplification rather than a bug, the review's job is partly to confirm the *known* risks are correctly scoped and mitigated as designed, and partly to find *unknown* ones — worth being explicit about which mode each finding falls into when reporting back.
- **What "done" means** — a written report with severity-ranked findings is the minimum; whether every finding must be fixed before this is closed, or whether some (like the SMS/PIN tradeoff) get re-confirmed as accepted risk and logged in `specs/PROGRESS.md`'s decisions log rather than fixed, is Jaideep's call per finding.

## Out of scope for this task

- Redesigning the auth model (e.g. adding SMS OTP) — that reverses a deliberate, costed decision per CLAUDE.md's explicit instruction not to do that without asking first. A review can recommend it; only Jaideep can approve building it.
- Migrating the remaining 13 local-only tables to the server — unrelated scope, tracked separately (see T-029, T-030).
