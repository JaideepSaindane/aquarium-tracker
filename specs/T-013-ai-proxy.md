# T-013 — AI proxy (Next.js API routes) and provider adapter

**Phase 1 · Depends on: T-001 · Size: 2 days**

*Updated 2026-08-31 for the web pivot: the proxy is now Next.js API routes in the same project, not a separate mobile-app-facing server.*

## Goal

A small set of API routes that hold the API keys, run retrieval, call the model, validate the response, enforce quota, and log cost. The browser never talks to a model provider directly.

## Why

Shipping an API key in client-side JavaScript means anyone can read it from the network tab or bundle and spend your money. There is no safe way to do it. The proxy is also where quota enforcement, caching and cost logging live — all of which are impossible client-side.

## In scope

- Next.js API routes (`app/api/*/route.ts`) in the same deploy as the app — no separate service needed. Split out later only if traffic demands it.
- **Provider adapter interface** so the model is a one-file change:
  ```ts
  interface ModelProvider {
    name: string
    analyseImage(input: { image: Buffer; prompt: string; schema: JSONSchema }): Promise<StructuredResult>
    answer(input: { messages: Message[]; grounding: CorpusChunk[]; schema: JSONSchema }): Promise<StructuredResult>
  }
  ```
- Two implementations: **Gemini 3.5 Flash-Lite** (default) and **Claude Haiku 4.5**. Consider routing emergency triage to Claude even while everything else runs on Flash-Lite — careful hedged reasoning matters more there than cost.
- Endpoints for the contracts in `docs/03-ai-contracts.md`: `/scan`, `/ask`, `/triage`, `/compat`, `/species-gen`, `/species-id`.
- **Retrieval**: load corpus entries and species rows relevant to the request and include them in the prompt. Every response must carry `grounding_refs`.
- **Schema validation** on every response before returning. On failure, retry once, then return a structured "could not analyse" — never pass malformed JSON to the app.
- **Quota enforcement** per anonymous device id: free tier gets 2 scans (`/scan`) and 15 questions (`/ask`) per month. **`/triage`, `/compat`, `/species-gen` and `/species-id` are unlimited and never counted** — triage because of Principle 02, and the rest because they fire naturally whenever someone adds a fish (which now happens for every tank, not just scanned ones, since livestock entry moved to a manual flow — see T-016), so counting them would charge people for using the app. `/compat`, `/species-gen` and `/species-id` are heavily cached/cheap per call, which is what makes this affordable.
- **Caching** by prompt hash. Common compatibility questions should cost once.
- **Logging** per call: prompt version, tokens in and out, cost, latency, provider, whether it was a cache hit.
- Prompts live in versioned files (`prompts/tank-scan.v1.md`), not inline in code.
- Bring-your-own-key mode: the key lives **in-memory, client-side, for the current session only** (not `localStorage`, which any script on the page can read) and is sent with the request over TLS. Use it for that single call, skip quota, and **never persist or log it** — not in the request log, not in an error trace, not in a crash report. Tell the user plainly that the key is not remembered between sessions.

## Out of scope

Accounts and authentication (anonymous device ids are enough for Phase 1). A dashboard for the logs — a queryable table is fine.

## Rules

- **Never log an API key.** Never log a raw user photo beyond what is needed to debug, and delete those on a schedule.
- Downscale images to ~1024px longest edge **client-side, using the Canvas API,** before sending to a provider. Cap output tokens on every call.
- Use the **paid** Gemini tier. The free tier trains on submitted data and may be human-reviewed — it must never see a real user's photos.
- Return the `prompt_version` in every response so the app can store it.

## Acceptance criteria

1. Calling `/scan` from the app with a photo returns a valid Tank Report matching the contract schema.
2. Deliberately breaking the model response (force it to return prose) results in a clean structured error, not a crash.
3. Making 3 scan calls on a free-tier device returns a quota message on the third, and the message names when the quota resets.
4. Making 20 triage calls never hits a quota.
5. The log table shows token counts and a cost figure for every call.
6. Asking the same compatibility question twice is served from cache the second time — visible in the log.
7. Switching the default provider from Gemini to Claude requires changing one line and everything still works.
8. No provider API key exists anywhere in the client-side bundle or is visible in the browser's network tab. *(Claude verifies this one, not Jaideep.)*
9. A request carrying a user's own key succeeds, skips quota, and leaves no trace of the key in the logs. *(Claude verifies.)*
10. Every response includes `grounding_refs`, and every id in them resolves to a real species row or corpus entry. A response with an unresolvable reference is logged as an error.
