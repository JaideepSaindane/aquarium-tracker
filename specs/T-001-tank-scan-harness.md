# T-001 — Tank Scan prompt harness (web)

**Phase 0 · Depends on: nothing · Size: 1–2 days**

## Goal

A single web page, running locally, where you drop in a photo of an aquarium and get back a rendered Tank Report. No mobile app, no database, no accounts.

## Why

Tank Scan is the entire product wedge (`docs/00-product-plan.md` §5). If a vision model cannot identify fish and spot problems accurately enough on real tank photos — glare, dark substrate, tinted glass, phone cameras in bad light — the plan changes. Finding that out in week one is worth far more than finding it out in month four.

Building it as a web page rather than in the app means the prompt can be iterated in seconds instead of minutes.

## In scope

- A minimal local web app: file input, dimensions fields, city field, submit.
- Server-side call to Gemini 3.5 Flash-Lite with the `tank-scan/v1` prompt from `docs/03-ai-contracts.md`.
- Retrieval: load `data/species.seed.json` and include the relevant subset in the prompt.
- Strict JSON output validated against the schema in the contract. Retry once on validation failure.
- Render the Tank Report: findings grouped by severity, confidence values shown, `could_not_determine` displayed prominently, clarifying questions listed.
- Save every request and response to a local folder as JSON, named by timestamp. **This becomes the evaluation set in T-002 — do not skip it.**
- Show token counts and estimated cost per call on screen.
- A prompt version string in every saved response.

## Out of scope

Authentication, styling beyond legibility, mobile layout, database, deployment. This is a workbench, not a product.

## Approach notes

- Node with a tiny Express or Hono server is fine. Keep it to a handful of files.
- Put the prompt in its own file (`prompts/tank-scan.v1.md`) so it can be edited without touching code. This is the file that will change fifty times.
- Downscale the image to ~1024px longest edge before sending. Log the before and after byte size so the cost difference is visible.
- Use the **paid** Gemini tier, not the free tier — the free tier trains on submitted data and these are real people's tanks. See `docs/01-architecture-research.md` §7.4.
- Keep the API key in a `.env` file that is gitignored.

## Acceptance criteria

Verifiable by using it:

1. Drop in a photo of a tank, enter dimensions and city, press submit — a report appears within about 20 seconds.
2. The report lists fish it can see, with a confidence value next to each.
3. The report lists at least one thing it could **not** determine. If it never says this, the prompt is over-claiming and needs fixing.
4. Submitting a deliberately terrible photo (very dark, or a photo of a wall) produces a "cannot analyse this, here is why" response — **not** a made-up report.
5. Every submission leaves a JSON file in the saved-responses folder.
6. Token count and estimated cost appear on screen for every call.
7. Editing the prompt file and re-submitting the same photo changes the result — proving the prompt file is actually the one being used.

## Notes for Claude Code

Jaideep is not a programmer. The final message on this task must include the exact commands to start the server and the exact URL to open, plus where to put the API key. Assume nothing.
