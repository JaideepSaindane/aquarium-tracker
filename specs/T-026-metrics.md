# T-026 — Local metrics and the 90-day survival prompt

**Phase 1 · Depends on: T-011, T-016 · Size: 1 day**

## Goal

Actually measure the numbers `docs/00-product-plan.md` §8 commits to. Without this task they are aspirations with no instrumentation.

## Why

The north star is **active tanks** — tanks with a log entry in the last 14 days — and the metric that matters most is **fish survival at 90 days**. Neither is measurable unless something records them. And survival is the one number no competitor can claim, so it is worth the small awkwardness of asking.

## In scope

**Local computation, no analytics SDK in Phase 1.** Everything is derived from the local database and shown to Jaideep in a hidden developer screen, plus optionally reported as anonymous aggregate counts. No per-user event tracking, no third-party SDK — that keeps the Play data-safety declaration simple and honest, and it is one fewer thing to disclose.

Metrics to compute:

| Metric | Definition |
|---|---|
| Active tanks | Tanks with any log entry, measurement or completed task in the last 14 days |
| Activation | Whether tank created + scan completed + one log entry happened within 48h of install |
| Logging retention | Days since install on which at least one log action occurred |
| AI trust | Count of thumbs-up, thumbs-down, and "this was wrong" reports, per 1,000 answers |
| **90-day survival** | Of livestock added more than 90 days ago, the proportion with `status = alive` |

**The survival prompt.** Once every few weeks, and only for livestock added more than 90 days ago whose status has not been touched, ask gently: *"Still doing well?"* with three options — yes, no longer with me, not sure. Recording a loss offers an optional cause, and never a number, a score, or anything that reads as a grade.

**Tone is the whole design problem here.** Someone whose fish died does not need an app keeping score. Per Principle 06 and `docs/04-design-system.md`: never blame, never quantify the user's failures back at them, and make the prompt genuinely skippable and easy to turn off permanently in Settings.

## Out of scope

Any third-party analytics SDK. Server-side aggregation. A user-facing stats dashboard (interesting later, but it risks turning care into a score).

## Acceptance criteria

1. A developer screen shows every metric above, computed from the local database.
2. Seeding the test database with livestock added 100 days ago produces a sensible survival figure.
3. The "still doing well?" prompt appears only for livestock older than 90 days with untouched status.
4. The prompt can be dismissed, and can be turned off permanently in Settings — and once off, never returns.
5. Recording a loss is one tap, offers an optional cause, and shows nothing resembling a score.
6. No third-party analytics SDK is present in the built app.
7. All of it works offline.
