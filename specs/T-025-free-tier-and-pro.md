# T-025 — Free tier limits and Pro subscription

**Phase 1 · Depends on: T-010, T-013 · Size: 2 days**

## Goal

Working subscriptions, with the free/paid line drawn where it does not poison the reviews.

## Why the line is where it is

Both competitors were punished for monetization, but not for charging — for *what* they put behind the wall. Aquareka paywalled knowledge and fell to 3.3★ with a genuinely good database. Aquarium Log paywalled nothing important but then escalated ads and pivoted to subscription, and lifetime purchasers turned on it.

> "Won't give you ANY information about fish unless you're paying for the premium version." — MyPrettyPony86 2.0, 1★ (Aquareka)

> "I paid for the lifetime of no adverts. Now you are giving me adverts!!" — Stevie Gibson, 1★ (Aquarium Log)

**We sell compute and continuity. We never sell facts, safety, or a user's own data.**

## In scope

**Free forever — verify none of these ever shows a paywall:**

- Unlimited tanks
- All species cards and all care data
- All disease reference content
- **Emergency triage, unlimited, never counted**
- Logging with **all eight standard parameters** (Ammonia, Nitrite, Nitrate, pH, GH, KH, Temperature, TDS), graphs, per-tank target thresholds
- **Compatibility checks and provisional species cards — unlimited and uncounted.** These fire on every livestock add; counting them would burn the free quota just for using the app, which would violate Principle 02
- Reminders and calendar
- Journal, photos, livestock timelines
- **Export — CSV, JSON, photos**
- Species Dex
- Adding, editing and **deleting** livestock
- 2 Tank Scans and 15 Ask questions per month
- **Bring your own API key → unlimited AI, free**

**Pro:**

- Unlimited Tank Scans, plus scan history and comparison over time
- Fair-use unlimited Ask
- **Custom parameters beyond the eight standard ones** (the eight are free)
- Unlimited cloud photo storage and timelapse *(Phase 2 — do not sell it before it exists)*
- Multi-device sync *(Phase 2 — same)*
- PDF tank reports

| Plan | India | Global |
|---|---|---|
| Monthly | ₹149 | $4.99 |
| Annual | ₹1,199 | $34.99 |
| Founder lifetime (first 1,000 users) | ₹2,999 | $79 |

- **Stripe Checkout + Customer Portal**, not RevenueCat/native IAP (updated 2026-08-31 for the web pivot — see `docs/01-architecture.md`). Stripe takes roughly 2–3% versus the 15–30% a native store would take, and supports India-relevant payment methods (UPI, cards) directly through Checkout. Regional pricing configured as separate Stripe Prices per currency.
- Subscription status is looked up server-side via Stripe webhooks, keyed to the same anonymous browser/device id used for AI quota — there are no accounts in Phase 1, so "who is Pro" is tracked the same way "who has used how much AI" is.
- **Honest quota display**: a visible counter showing scans and questions remaining, before the limit is reached. Never a surprise wall.
- Paywall screens state plainly what is *not* behind the wall — it is a genuine differentiator and it defuses the reflex reaction to seeing a subscription.
- **No ads. Anywhere. Ever.** Do not integrate an ad SDK, not even disabled.

## Out of scope

Selling Phase 2 features before they exist. Trials (the free tier is the trial). Any consumable purchase.

## Commitments to put in writing in the app

- Founder lifetime is honoured forever, including features added later.
- If development ever stops, everything unlocks and the data exports.

These cost nothing today and directly answer the fear every user of the failing incumbent currently has.

## Acceptance criteria

1. Every item on the free list is reachable with no Pro account and shows no paywall. **Check each one individually.**
2. Running 20 emergency triages never shows a Pro prompt or hits a quota.
3. Export works with no Pro account.
4. Deleting a fish works with no Pro account.
5. The scan counter shows "1 of 2 left" before the second scan, not after the third fails.
6. Completing a Stripe test-mode Checkout for monthly Pro unlocks unlimited scans immediately (via the webhook updating subscription status).
7. The paywall screen lists what stays free.
8. Entering a personal Gemini API key gives unlimited AI with no purchase. The key is held **in-memory client-side for the current session only**; it is sent to our proxy over TLS **for the duration of a single call only**, and is never persisted or logged server-side. *(Claude verifies the server side, not Jaideep.)*
9. Restoring purchases after clearing site data / reinstalling the PWA works via the Stripe Customer Portal, looked up by whatever identifier (email at Checkout time, most likely) ties a browser back to a subscription.
10. No ad SDK is present anywhere in the app's dependencies. *(Claude verifies this one by inspecting the dependency tree, not Jaideep.)*
11. No Pro feature is advertised that does not yet exist. In particular, cloud sync and timelapse are Phase 2 — do not list them on the paywall until they ship.
12. Adding ten fish in a row, each triggering a compatibility check, does not decrease the remaining question count.
