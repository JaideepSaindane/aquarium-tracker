# AquaAI

A mobile-first web app that takes someone from "I think I want fish" to a thriving planted tank. Works in any phone browser, installable to the home screen — no app store.

This repository currently contains **no application code**. It contains the plan, the specifications, the data and the rules — everything Claude Code needs to write the app, and everything you need to run the project without being a programmer.

---

## Start here if you have never done this before

You are going to build a mobile app by describing tasks to Claude Code, which writes the code. You do not need to understand the code. You **do** need to understand what the app should do and be willing to test it on your phone. That is the job.

### What you need before anything else

| Thing | Cost | Notes |
|---|---|---|
| A computer (Mac, Windows or Linux) | — | Any of the three works |
| An Android phone **and**, if possible, an iPhone | — | For testing. Desktop browser tools do not reproduce real phone behaviour for camera, local storage or push notifications — see "Why real phones" below |
| Node.js (LTS version) | Free | Download from nodejs.org, install, restart your terminal |
| Git | Free | Comes with most systems; `git --version` tells you |
| Claude Code | Subscription | The tool that writes the code |
| A Google AI Studio API key | Free to start | aistudio.google.com — for the AI features |
| A Vercel account | Free to start | For deploying the app so it's live at a real URL |
| A Stripe account | Free to start | Only needed when you are close to charging for Pro |

No Play Console fee, no Apple Developer Program, no app-store review — this is a web app.

### Setting up

Open a terminal, go to the folder where you keep projects, and run:

```
cd path/to/this/folder
git init
git add .
git commit -m "Initial plan and specs"
claude
```

That last command starts Claude Code inside this folder. It will read `CLAUDE.md` automatically.

Then say to it:

> Read CLAUDE.md and docs/00-product-plan.md. Then do task T-001 from specs/.

### Working day to day

**One task at a time.** The tasks are in `specs/`, numbered. Say "do T-011" and let it finish before starting the next. Resist the urge to ask for three things at once — it produces worse code and makes it much harder to tell which change broke something.

**Commit after every task that works.** In Claude Code, say "commit this." A commit is a save point you can return to. This is your undo button and you will need it.

**Test the acceptance criteria yourself.** Every spec ends with a list of things you can check by using the app. If Claude says a task is done and an acceptance criterion fails, say so — do not accept "it should work."

**When something breaks, paste the whole error.** Not a description of it. The whole thing, exactly as it appeared.

**When you are asked to choose between two approaches, choose.** Claude has been instructed to ask rather than silently pick. If you genuinely do not know, say "explain both like I'm not a programmer" — that is a legitimate answer.

### Why real phones

This app sends reminders — water change due, CO₂ refill, trim the plants — using Web Push. On iPhone, push notifications only work once the app is **installed to the home screen** (Add to Home Screen) and only on iOS 16.4 or later; a user who just visits the site in a browser tab cannot get reminders at all, no matter what they grant. Desktop browser tools do not reproduce this. You will need to install the app on both a real Android phone and, ideally, a real iPhone, and confirm that a reminder set for tomorrow morning actually arrives on each. Budget real time for this; it is the single most likely feature to quietly not work.

---

## What is in this repository

```
CLAUDE.md              The rules Claude Code reads every session. The most important file here.
README.md              This file.

.claude/commands/
  task.md              Type /task T-011 to run a task the proper way.
  check.md             Type /check to audit the project against its own rules.

docs/
  00-product-plan.md   Why this app exists, what it is, what it is not. Read once.
  01-architecture.md   The technology choices and why. Verified Aug 2026.
  02-data-model.md     How information is stored. The shape of everything.
  03-ai-contracts.md   The AI prompts and the exact JSON they must return.
  04-design-system.md  Colours, type and components, so screens look like one app.
  05-content-guide.md  The safety topics you must write, and the Hinglish rules.
  06-shipping.md       Getting the web app live — much shorter than a store checklist. Read before you need it.
  01-architecture-research.md   Raw research notes with sources. Reference only.

specs/
  README.md            The task list and, importantly, the build order.
  PROGRESS.md           What is done, what is next, and the decisions log.
  T-0xx-*.md            Numbered tasks. Each has acceptance criteria you can check.

data/
  species.seed.json    30 species with researched care parameters and sources.
  README.md             How to expand this to 150 and how verification works.

content/               Created by T-004. Where the safety corpus will live.

tank-scan-harness/     T-001/T-002 workbench — not part of the shipped app.

src/, app/, public/    The actual Next.js web app, from T-010 onward.
```

**Two shortcuts worth knowing.** In Claude Code, `/task T-011` runs a task with the full workflow — read the spec, stay in scope, report acceptance criteria honestly. `/check` audits the whole project against its own rules and tells you if anything has drifted. Run `/check` every couple of weeks.

---

## The order things happen in

**Phase 0 — before any app code (T-001 to T-003).** Build the Tank Scan as a simple web page, feed it 50 real tank photos, and grade the results yourself. If it cannot identify fish and spot problems accurately enough, the whole idea needs rethinking and it is far better to learn that in week one than in month four. Do not skip this.

**Phase 1 — the app (T-010 onwards).** Next.js web app, local database, export, then the actual features. Roughly twelve weeks of part-time work. **Follow the build order in `specs/README.md`, not the task numbers** — the hero feature, Tank Scan, writes into six other things and has to come after them.

**Two things to start immediately, in parallel with everything else** — a web app removes the old Play Store 12-tester/14-day testing gate, so this list is shorter than it used to be:

1. **Write the safety topics.** They are listed in `docs/05-content-guide.md` §2. This is the knowledge that grounds every AI answer, it is the thing that stops the app giving advice that kills someone's fish, and it is the part no AI can do for you reliably. A few hours a week from now until launch.
2. **Find a Tier 1 reviewer.** Anything the app says about medications, doses or treatment protocols needs a named aquatic vet or credentialled aquaculture professional to sign it off before the AI is allowed to cite it. This is the longest lead time in the whole project, and you can launch without it — those entries ship as "here's what it is and when to escalate", with dosing withheld — but start asking around now.

---

## Words you will see

**PWA (Progressive Web App)** — a website that can be installed to a phone's home screen and runs full-screen like an app.
**Next.js** — the web framework this app is built with; also runs the small server-side code (API routes) the app needs.
**SQLite (WASM)** — a database that runs inside the browser itself, persisted locally, so it works with no internet.
**Migration** — a script that changes the database shape without destroying data already in it.
**Deploy** — publishing a new version of the code so it's live at the real URL. Happens automatically on Vercel when code is pushed.
**Web Push** — the standard that lets the app send notifications (reminders) to an installed device.
**Grounding / corpus** — the hand-written knowledge the AI must answer from, rather than making things up.
**Token** — how AI usage is measured and billed. Roughly ¾ of a word.

---

## Ground rules worth keeping

Taken from the two competitors' one-star reviews. These are in `CLAUDE.md` too, because Claude Code needs them as much as you do.

1. **Advise, never block.** Always let someone record the tank they actually have, then explain the risk.
2. **Never paywall knowledge or safety.** Care data, disease information and emergency help are free forever.
3. **Never say "not found."** A missing species gets a provisional card immediately, flagged for review.
4. **Their data is theirs.** Export works on the free tier, from early on.
5. **Works at the tank, offline.**
6. **Calm, not addictive.** It is a pet care app, not a game.
