# 00 — Product plan

Why this app exists, what it is, and what it deliberately is not. Read once before your first substantial task; refer back when a scope question comes up.

Evidence base: the full Google Play review sets for **Aquareka** (3.3★, 323 reviews, 100K+ downloads) and **Aquarium Log** (4.3★, 1,750 reviews, 100K+ downloads), plus market and competitor research conducted August 2026. Quotations below are verbatim from those listings.

---

## 1. What the reviews prove

### The market is split down the middle

These are not two similar apps. They are two halves of one product, each failing where the other succeeds.

**Aquareka** answers *"what should I keep?"* — a species database with a compatibility engine — and has essentially no logging. **Aquarium Log** answers *"what happened in my tank?"* — parameters, graphs, reminders, journal — and has almost no decision support.

Users of each are asking for the other's job. An Aquarium Log reviewer asks for the competitor by name:

> "My only request would be that their fish database include more structured information re: recommended parameters (and maybe identification of incompatibilities, like Aquareka does?)" — Angela, 5★

**That middle is empty. It is the opportunity.**

### Aquareka's fatal mistake was blocking, not the paywall

The paywall complaints are loud — roughly a quarter of visible reviews. But the *angriest* reviews are from people the app refused to let record the tank they already owned.

> "At least you could let us try the app by letting us add the fish we really have… it won't let you add it. Almost any fish has a requirement of 200L aquarium and if yours are 190L you won't be able to add any of your fish." — Julio Odin Marqez, 1★

> "This app says that Kuhli loaches and Corydora catfish are incompatible. While this may be true in a tiny tank, an aquarium with a sufficiently large bottom can and will support both. Add tools for handling exceptions and I give 5 stars." — Google user, 3★

The second quote diagnoses the root cause precisely: the app stored **volume** but not **footprint**. A 190L cube and a 190L long tank are different homes, and a rules engine that cannot see the difference produces confident wrong answers. A reviewer says it outright: *"this doesn't include length, width and height info which is needed for choosing a fish."*

This is where the LLM bet comes from. Aquareka failed not because rules-based advice was wrong, but because encoding species-by-species nuance into `if` statements produces a brittle tyrant. A grounded model handles "will these live with my guppies?" with the hedging and context the hobby actually requires — and can say *it depends on your tank's footprint, and here is why*.

### Every app in this category dies of database gaps

Missing species is the single most repeated complaint across **both** apps: platies, koi, comets, iridescent sharks, Hawaiian red shrimp, conch. On Aquarium Log, user-submitted species silently disappear.

> "Doesn't even have the fish I already have. Waste of time!" — Google user, 1★

A static hand-curated database is a treadmill no solo developer wins. This is why Principle 03 exists.

### People are losing years of data

Aquarium Log has no reliable multi-device sync and never shipped the CSV export it promised in February 2023.

> "I have a new phone and it hasn't imported my aquarium so I've lost all my previous measurements." — Curtis Pouncey

> "switch to a new phone and I have no way of pulling my old data, the backup does not work" — Muhammad Awais Khan, Jan 2026

This turns five-star evangelists into one-star reviews, and it is the cheapest thing on the list for us to solve.

### What people love is the developer, not the features

Count how many five-star Aquarium Log reviews are actually about the developer replying within a day. Responsiveness *is* the product in this category.

> "The developer is also incredibly attentive to his users' needs and suggestions, and goes out of his way to make sure the app lives up to expectations." — catscity, 5★

---

## 2. Why now

**The category leader is visibly failing.** Aquarium Log's 2026 reviews report the app freezing on the splash screen, taps not registering on a Galaxy S24, login failures, broken image tagging, a subscription pivot that angered lifetime purchasers, aggressive full-screen ads, and support going silent.

> "I really like this app. At one point I had given it 5 stars. However, I haven't seen many updates from the developer in several months… I've emailed several times… these last several emails have received no response. It's been several months now." — Stuart, 3★, 2 Aug 2026

> "I paid for the lifetime of no adverts. Now you are giving me adverts!!" — Stevie Gibson, 1★

**The AI entrants are early and thin.** The best-positioned one on Play has 10K+ downloads and 40 reviews, and its headline feature is letting you bring your own API key. TankBrain is a free web compatibility checker, not an app. Aquabuildr puts an AI chatbot behind a $39.99/yr wall. Nobody has shipped an AI-native aquarium app a beginner would keep for a year.

**The market is real and local.** India's ornamental fish market was USD 160.7M in 2024, growing at 10.3% CAGR toward USD 288.8M by 2030, concentrated in Tamil Nadu, Kerala and Karnataka. Being in Bangalore means being inside the densest breeding-and-retail cluster in the country, with active local communities to recruit the first 500 users by hand. That is a distribution advantage the American solo developers competing here do not have.

---

## 3. Positioning

> **Every other aquarium app assumes you already know what you're doing. AquaAI is the one that answers the question you're too embarrassed to ask — and then remembers the answer for your tank.**

**Primary audience: the anxious beginner, months 0–12.** One tank, probably too small, probably uncycled, probably overstocked on a shopkeeper's advice. Loses fish, blames themselves, quits. This is where the hobby leaks people and where AI genuinely changes outcomes. It is also where Hinglish matters most — this person googles in English and thinks in Hinglish.

**Secondary: the multi-tank hobbyist, years 2+.** Already logs. Will only switch for better logging *plus* something new. They are the credibility and the community's answer supply, but do not design for them — every app in this category already did, and it is a small market.

**Not yet: reef and marine.** Different chemistry, different equipment, ten times the support burden, and a crowded app market. Freshwater and planted only. "Built for freshwater" is a position, not a gap.

---

## 4. The six principles

Full text in `CLAUDE.md`. Each is a specific competitor failure converted into a rule:

1. **Advise, never block** — from Aquareka refusing to record real tanks.
2. **Never paywall knowledge or safety** — from Aquareka's 3.3★ despite a good database.
3. **Never say "not found"** — from the universal missing-species complaint.
4. **Their data is theirs** — from users losing years of logs on a phone change.
5. **Works at the tank, offline** — from Aquareka's most-praised feature and Indian network reality.
6. **Calm, not addictive** — because it is a pet-care app, not a game.

---

## 5. The wedge: Tank Scan

One photo of a tank, two questions, and a structured Tank Report no competitor can produce. It replaces a twenty-field setup form with a camera shutter, it is the store screenshot, it is what someone shows a friend, and re-scanning monthly is the reason to open the app again.

Everything else in v1 — logging, reminders, the Dex — is table stakes Aquarium Log already proved people want. **Tank Scan is the reason to switch.**

Six steps: capture with an on-device quality gate → two questions (dimensions, city) → structured JSON with per-field confidence → the Tank Report ranked fix-now / watch / improve, every claim traceable to its source → tank is now set up, equipment and plants and reminders all pre-filled, livestock added by the user next → re-scan monthly and compare.

**Livestock (species) identification is deliberately NOT part of Tank Scan**, decided 2026-08-31 after running T-002's accuracy evaluation against 25 real tank photos. The model was strong on equipment (94%), algae type (88%) and count accuracy (83%) — but weak on identifying schooling nano fish specifically (37.5%, including at least one confident wrong call on an easy, well-lit photo). Rather than ship a feature whose most visible number is its least reliable one, Tank Scan reports what a photo can actually answer well: equipment, hardscape/setup type (bare-bottom, planted, etc.), plants, algae, and overall condition. **Livestock is added by the user** from Tank Report onward: a species-picker (dropdown/search, same one used everywhere else in the app), one species at a time, with counts. For anyone who genuinely doesn't know what fish they have, a separate, explicitly opt-in **"I don't know this fish — help me identify it"** flow takes a close-up photo of a single fish and returns ranked candidate matches (`species-id/v1`, see `03-ai-contracts.md`) — framed to the user as a suggestion to confirm, never an assertion. This keeps the single-species case (where a close, well-lit photo genuinely helps) without baking an unreliable multi-species guess into the hero flow.

**The honest limitation, for everything Tank Scan still does:** a photo cannot see inside a filter and cannot tell you your nitrate. The report should say what it *could not* see and ask. Under-claiming builds the trust the whole app runs on.

Full contracts in `03-ai-contracts.md`.

---

## 6. Scope decisions

Assessed against the original brief:

| Idea | Call | Reasoning |
|---|---|---|
| Stage picker (thinking / have one / emergency) | **Keep** | Three genuinely different products behind one door. Emergency is the highest-intent moment in the hobby. |
| Tank Scan | **Keep** | The wedge. Build first. |
| Species Dex (Pokémon-style cards) | **Keep** | Cheap, delightful, shareable card image is a free distribution loop. Care facts on the card face are never locked. |
| Journal + photos | **Keep** | Aquarium Log's most-loved feature after graphs. Add per-livestock timelines — repeatedly requested there, never shipped. |
| Export everything | **Keep** | Free tier, early. A trust weapon aimed at the incumbent's worst wound. |
| Reminders + calendar | **Change** | Keep, but Aquarium Log's scheduling UI defeated people who loved everything else. Six one-tap presets with defaults from the scan — water change, filter clean, dose, CO₂ refill, trim, test — with custom scheduling behind "more". |
| Community | **Change** | Ship "Ask the Tank" + photo feed in Phase 2. Cut trading entirely. |
| Leaderboard | **Change** | A global leaderboard rewards collecting species and overstocking. Rank *care*: logging consistency, parameter stability, tank age, fish thriving past 12 months. |
| Pet-type picker (Fish/Paws/Kitty) | **Cut** | Dead end on the first screen; every non-fish option leads nowhere. Signals "generic pet app", the opposite of the positioning. |
| Hindi in Devanagari | **Cut** | Hinglish in Latin script is how this audience types. Devanagari doubles content QA for a fraction of the reach. |
| **Cycling coach** *(added)* | **Add** | The nitrogen cycle is where most beginners lose fish and quit. Nobody has built this well. Aquareka had an unskippable 7-day timer users hated — do the opposite: explain, show progress, never block. |
| Shop / equipment finder | **Defer** | Real value in India, plausible revenue. Needs data we do not have. Phase 3. |
| Breeding / raising logs | **Defer** | Small advanced audience. Phase 3. |

---

## 7. Monetization

Freemium plus subscription — but the reviews are brutal about subscriptions, and the lesson is that the subscription is not the problem, *what sits behind it* is. Draw the line on **continuity, storage and depth**. Never on knowledge, safety, or a user's own data.

**Free forever:** unlimited tanks, all species cards and care data, all disease reference, emergency triage unlimited, **all eight standard parameters** with graphs and per-tank thresholds, reminders, journal and photos, livestock timelines, the Species Dex, adding *and deleting* livestock, export (CSV/JSON/photos), offline, 2 Tank Scans and 15 AI questions per month, bring-your-own-API-key for unlimited AI. Compatibility checks and provisional species cards are unlimited and uncounted.

**Pro:** unlimited Tank Scans with history and comparison, fair-use unlimited AI, **custom parameters beyond the eight standard ones**, unlimited cloud photo storage and timelapse, multi-device sync, PDF tank reports.

| Plan | India | Global |
|---|---|---|
| Monthly | ₹149 | $4.99 |
| Annual | ₹1,199 | $34.99 |
| Founder lifetime (first 1,000) | ₹2,999 | $79 |

Annual undercuts Aquabuildr ($39.99) and AquaticLog ($45.99).

**Three commitments worth publishing:**

- **No ads, ever.** Aquarium Log's ad escalation cost it multiple 1★ downgrades from paying evangelists. Ads plus a paid tier is a promise you will eventually break.
- **Founder lifetime is honoured forever,** including features added later.
- **If development ever stops, everything unlocks and the data exports.** This costs nothing today and directly answers the fear every user of the incumbent is feeling right now.

Note from the architecture research: **AI inference is not the reason to paywall.** A Tank Scan costs a fraction of a US cent. Be generous with AI on the free tier — it is cheap, and it is exactly where the incumbent is bleeding.

---

## 8. Metrics

| | |
|---|---|
| **North star** | **Active tanks** — tanks with a log entry in the last 14 days. Not users, not installs. |
| Activation | Tank created + scan completed + one log entry within 48h of install. Target 35%. |
| Retention | D30 logging retention, target 25% by end of Phase 2. Watch week 4 specifically — that is when the cycling window ends and beginners either succeed or quit. |
| Trust | % of AI answers rated helpful, and the absolute count of "this was wrong" reports per 1,000 answers. The second matters more and should trend down as the corpus grows. |
| **The one that matters most** | **Fish survival at 90 days**, self-reported. Noisy and imperfect, but it is the actual outcome we sell and no competitor can claim it. |

---

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| AI gives confidently wrong care advice; a fish dies; the review says so | **Critical** | Grounded retrieval with citations; confidence gating; hand-written content for the 60 highest-risk topics; never dose without confirmed volume; always test before treating; visible correction path |
| Solo-developer burnout — exactly what is happening to the incumbent | **Critical** | Ruthless Phase 1 scope. No community, sync or iOS until the core retains. Publish a cadence that is sustainable, not impressive |
| Species database gaps drive the same 1★ reviews everyone else gets | High | Principle 03 — provisional cards, usable immediately, queued for review |
| Tank Scan underperforms on real photos (glare, low light, tinted glass) | High | Test in Phase 0 *before* writing app code. On-device quality gate. Under-claim and ask. If accuracy will not hold, the wedge shifts to the cycling coach |
| Subscription backlash mirrors the incumbent's | High | Never paywall knowledge or user data. No ads. Founder lifetime. BYO-key escape valve. Publish the sunset commitment |
| Play closed-testing requirement delays launch by 2+ weeks | High | Calendar risk, not code risk. Recruit 15–18 testers from week one; push a rough build early so the clock runs while building continues |
| Web Push reminders don't work until the app is installed to the home screen (iOS especially) | High | Clear in-app install prompt after first value moment, honest messaging about the requirement, in-app diagnostics screen. Test on a physical Android phone and a physical iPhone. See `docs/01-architecture.md` §Notifications |
| Community turns toxic or spam-heavy | Medium | Hand-seed the first 200. Tank-attached questions only. No DMs. Ship report/block before posting |
| Aquarium Log revives and ships sync and export | Medium | Assume it happens. Defensibility is Tank Scan, grounded AI and India-local context — not better logging. Do not let the roadmap drift into feature-matching |
| Play policy exposure on live-animal trading | Medium | Do not ship a marketplace. Revisit with legal review |

---

## 10. Naming

"AquaAI" is close to unsearchable, there is already an app called *Aquarium AI* on Play, and "AI" in a product name will read dated within two years. Alternatives worth testing: **Tanklore**, **Finn**, **Aquarist**, **Shoal**, **Bettr**.

Keep AquaAI as the working title. **Decide before the Play listing goes up** — renaming after launch costs every review.
