# AquaAI

A mobile-first web app that takes someone from "I think I want fish" to a thriving planted tank. Works in any phone browser, installable to the home screen — no app store required. Freshwater and planted only; not reef or marine.

**Live at [aquaai-web.vercel.app](https://aquaai-web.vercel.app).**

The wedge is **Tank Scan**: one photo of a tank plus two questions returns a structured report — detected setup, plants, algae, equipment, and a ranked action list. It also acts as onboarding, so a new user sets up their tank by taking a photo instead of filling in a form.

> Working title — the name is not final.

---

## Status

This is an active, working app, built almost entirely through [Claude Code](https://claude.com/claude-code) from a written product plan and task specs rather than hand-written line by line. Core functionality — Tank Scan, livestock and plant tracking, parameter logging with graphs, reminders (Web Push), emergency triage, an AI Q&A assistant grounded in a hand-written safety corpus, a species encyclopedia, journal/photo gallery, and full local data export — is built and deployed.

Not yet done: full safety-corpus review by a named aquatic professional, billing/Pro tier (currently free for everyone while in early access), and broader language coverage. See `specs/PROGRESS.md` for the honest, detailed state of every task, including what's been verified live versus only code-reviewed.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), React 19, TypeScript strict |
| Rendering | Installable PWA, mobile-first |
| Local database | SQLite compiled to WASM, persisted via OPFS, Drizzle ORM — the source of truth; the app works offline by design |
| UI state | Zustand |
| Network state | TanStack Query, for AI/network calls only |
| Notifications | Web Push (VAPID) with a small backend for scheduling |
| AI | Provider-agnostic adapter (Gemini by default), called only from server-side API routes — every response is structured JSON against a declared schema, grounded in a hand-written content corpus, never a raw model guess on safety-critical topics |
| Deploy | Vercel |

Full reasoning and the current architecture live in `docs/`.

---

## Repository layout

```
CLAUDE.md              The project's own rules — read by both Claude Code and any human contributor.
docs/                  Product plan, architecture, data model, AI contracts, design system, content guide.
specs/                 Numbered task specs, each with acceptance criteria, plus PROGRESS.md (the real build log).
content/               The safety/care knowledge corpus the AI is required to cite, not guess from.
data/                  Seed species catalog with sourced care parameters.
prompts/               Versioned AI prompt templates.
src/, app/, public/    The Next.js application.
tank-scan-harness/     Early standalone workbench used to validate the Tank Scan concept before the app existed.
```

---

## Working on this project

This repository is developed using Claude Code against a written specification, not ad hoc prompting. `CLAUDE.md` is the project constitution — product principles, stack rules, and working conventions — and is read at the start of every session. `specs/` holds the task backlog in build order; `specs/PROGRESS.md` is the single source of truth for what's actually done versus in progress.

```
claude
```

then, inside Claude Code:

> Read CLAUDE.md and docs/00-product-plan.md. Then do task T-0xx from specs/.

Two custom commands exist: `/task T-0xx` runs a task against its spec with full acceptance-criteria discipline; `/check` audits the whole project against its own stated rules.

---

## License

All rights reserved. See `LICENSE`.
