# 06 — Shipping: Getting the Web App Live

**Written for:** a solo founder in Bangalore, not a professional developer, using Claude Code to write the app.
**Updated:** 31 August 2026, for the pivot from native (Play Store) to a web app. The previous version of this document — the 14-day testing gate, the $25 Play Console account, the Apple guidelines, the Doze-mode reminder engineering — described the native plan and is now superseded. It is a useful record of what we're deliberately *not* dealing with, not a checklist to follow.

---

## 0. The 60-second version

| | |
|---|---|
| **Cash to get live** | **$0** to start (a free Vercel tier covers early usage) |
| **Do you need a store account?** | **No.** No Play Console, no Apple Developer Program. |
| **Realistic time from "code done" to live for users** | **Same day.** Push to `main`, it deploys. |
| **The thing most likely to break** | Reminders not arriving on iPhone unless the user has installed the PWA (Add to Home Screen). |
| **Biggest hidden ongoing cost** | Same as before — **AI API calls**, if you don't cap them. |

This is the headline benefit of the pivot: the entire "12 testers, 14 continuous days, then up to 7 days of Google review" gate — which used to set the actual launch date for this project — does not exist for a web app. You are not exempt from *being ready* (a broken, half-tested app is still bad for a real user), but nothing external gates when you're allowed to let people in.

---

## 1. Jargon, defined once

- **Vercel** (or an equivalent host) — a service that builds and serves your Next.js app, and runs your API routes as serverless functions. You push code; it deploys automatically.
- **PWA** (Progressive Web App) — a website that can be "installed" to a phone's home screen, runs full-screen like an app, and can (with the right setup) receive push notifications and work offline.
- **Preview deploy** — Vercel automatically builds a live, shareable URL for every branch/PR, separate from production. Useful for showing Jaideep a change before it goes live for real users.
- **VAPID keys** — a public/private key pair that identifies your server to push services (Google's, Apple's, etc.) when sending Web Push notifications. Generated once, stored as environment variables.
- **Environment variables** — secrets (AI API keys, Stripe keys, VAPID keys) configured in Vercel's dashboard, never committed to the code.
- **Custom domain** — your own domain name (e.g. `aquaai.app`) pointed at Vercel, instead of the default `*.vercel.app` address. Optional to start, worth doing before telling real users about the app.

---

## 2. What it costs

| Item | Cost | Notes |
|---|---|---|
| Vercel hosting | **$0** on the Hobby tier while usage is low | Upgrade to Pro ($20/month) only if you exceed free-tier limits or want a team/commercial use license — check Vercel's current terms, Hobby is technically for non-commercial use |
| Domain name (optional but advised) | ~$12/yr (~₹1,150/yr) | Buy from any registrar; point it at Vercel |
| Stripe | **0 setup cost**, ~2–3% + a small fixed fee per transaction | No monthly fee; you only pay when you're actually charging someone |
| AI API calls | Scales with usage — see below | Same risk as the native plan, unchanged by the pivot |
| Push notification sending | **$0** — Web Push doesn't require a paid service, just your own backend and VAPID keys | |
| Privacy policy hosting | $0 | Same page works, still required — see §4 |

**Minimum realistic spend to launch: $0, plus the cost of a domain name if you want one.** No store fee, no annual recurring platform charge.

### The cost that will actually surprise you: AI calls

Unchanged from the native plan. Cheapest verified vision-capable model as of Aug 2026 is **Gemini 3.5 Flash-Lite** at $0.10/$0.40 per million input/output tokens. Downscale every image to ~1024px before sending — this is still the single biggest lever on your bill. Cap output length, rate-limit free users, log token counts from day one. Gemini 3.6/3.7 Flash double in price on 1 January 2027 — don't build your unit economics on a promotional rate.

---

## 3. What you no longer have to deal with

Worth stating explicitly, since the old version of this document spent thousands of words on these:

- No $25 Play Console fee, no government-ID identity verification, no 12-tester/14-day closed testing gate, no production-access application form.
- No $99/year Apple Developer Program, no D-U-N-S number, no App Review Guidelines, no TestFlight.
- No `USE_EXACT_ALARM` policy risk, no Doze-mode battle, no Xiaomi/OPPO/Vivo/Realme battery-killer onboarding cards.
- No app icon/feature-graphic/screenshot size requirements for a store listing (you'll still want good PWA icons and an OG image for link previews, but there's no review process checking them).
- No IARC content rating questionnaire, no Data Safety form as a separate store artifact.
- No mandatory in-app purchase system lock-in — Stripe can use UPI, cards, and whatever payment methods make sense in India, at a fraction of the store cut.

What replaces "passing store review" as the bar for launch is simpler and entirely in your control: **the app works, on a real phone browser, for the things you're about to tell people to do.**

---

## 4. What you still need — the real, unavoidable list

- **A privacy policy, publicly hosted**, that specifically names your AI provider (Gemini/Claude) as a third party that receives user photos. Not a store requirement anymore, but still an honest obligation, and Stripe's onboarding will ask for one too if you take payments.
- **HTTPS everywhere.** Non-negotiable and automatic on Vercel — also required for OPFS (local storage), camera access, and Web Push to work at all in the browser.
- **A support contact** (an email you actually check) — visible in the app, e.g. in Settings.
- **Terms of Use**, sensible before charging anyone money, mandatory if you ever add any user-generated content (not planned yet — see CLAUDE.md).
- **Stripe account set up and verified** before charging real money — takes bank details and basic KYC, budget a day or two for verification, do it before you need it.
- **A domain name**, so the app has a stable, memorable, professional address instead of a `vercel.app` subdomain. Optional for early testing, worth doing before wide sharing.
- **PWA install prompt tested on a real Android phone and a real iPhone** — this is now the thing standing in for "app store install," and it must actually work, including the reminder permission flow.

---

## 5. Reminders — still the part to test carefully, for a different reason

Web Push is a real, standard technology, not a workaround — but iOS Safari has one hard requirement: **the site must be installed to the home screen (Add to Home Screen), and the device must be on iOS 16.4 or later**, before push notifications work at all on iPhone. A user who just visits the site in a browser tab on their iPhone cannot receive push notifications, full stop, no matter what permissions they grant.

**What this means practically:**

- Build a real "install this app" moment in onboarding — after the first Tank Scan is a good place, when the user has already gotten value.
- Be honest in-app about the requirement rather than silently letting reminders fail: something like "To get reminders on iPhone, add AquaAI to your Home Screen first" with the exact steps.
- Android (Chrome) supports Web Push without installation, though installing still improves the experience — so the requirement is iOS-specific.
- Build and test the "Are my reminders working?" diagnostics screen from `docs/01-architecture.md` — permission state, subscription status, and a 60-second test button — on both platforms before considering reminders done.

**Testing checklist:**
1. Install the PWA on a real Android phone, grant notification permission, confirm a scheduled reminder arrives.
2. Install the PWA on a real iPhone (iOS 16.4+) via Add to Home Screen, grant notification permission, confirm a scheduled reminder arrives.
3. Confirm the app remains fully usable (task list visible, nothing broken) for someone who declines notification permission or hasn't installed.

---

## 6. Suggested order of operations

1. **Set up Vercel, connect the repo, get a first empty deploy live.** Do this in week one — it costs nothing and means every feature can go live incrementally rather than in one big bang at the end.
2. **Build.** Every merge to `main` is a real deploy; use preview deploys for anything you want to check before it's live.
3. **Buy a domain when you're ready to start sharing the app with real people** (testers, friends, early users) rather than at the very end.
4. **Set up Stripe before you need to charge anyone** — verification takes a little time, don't let it block a launch.
5. **Write and host the privacy policy** before any real user's photo goes to an AI provider — same obligation as before, just no store form to fill in alongside it.
6. **Test the full PWA install + push flow on a real Android phone and a real iPhone** before telling anyone reminders work.
7. **Watch AI costs from day one** — this risk is completely unchanged by the pivot to web.

---

## 7. What I could not verify

- **Vercel's current Hobby-tier terms for commercial use** — historically restricted to non-commercial/personal projects, with a Pro tier required once you're running a real product. Confirm at vercel.com/docs/limits before charging real customers on the free tier.
- **Current OPFS and Web Push support percentages across mobile browsers** — check caniuse.com for both at project start; this document's date should not be trusted for browser support facts by the time you read it.
- **Exact iOS Safari Web Push behaviour** (any changes since iOS 16.4) — check current WebKit release notes.
- **Stripe's exact India-specific fees and supported payment methods** (UPI, Indian card networks) — confirm at stripe.com/en-in/pricing at project start.
