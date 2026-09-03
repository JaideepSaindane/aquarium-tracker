# T-019 — Ask AquaAI

**Phase 1 · Depends on: T-013, T-016, T-017, T-018 · Size: 2 days**

## Goal

Ask a question in English or Hinglish and get a grounded, structured answer that already knows your tank.

## Why

"Will these live with my guppies?" is the question the whole product exists to answer. The advantage over a search engine or a Facebook group is that the app already knows the tank — the user never has to explain their setup, and the answer is specific rather than generic.

## In scope

- A question input on the Ask tab, and a contextual "ask about this tank" entry point from any tank screen.
- **Tank context assembled automatically** per `docs/03-ai-contracts.md`: dimensions, volume, water type, planted, CO₂, city, tank age, all livestock and plants with their care ranges, equipment, last five readings of every parameter with target ranges, last ten log entries.
- Call `/ask`, render the structured response:
  - The short answer prominently.
  - **`based_on_your_tank`** shown as a visible list — this is the cheapest trust mechanism in the product and must never be hidden behind a tap.
  - `warnings` rendered by severity, above the fold when critical.
  - `actions` as real buttons: create a reminder, log a measurement, open a species card, open a corpus entry.
  - `grounding_refs` as tappable `GroundingLink`s.
  - "Tell me more" reveals `detail`.
  - `uncovered: true` shows plainly that the corpus does not cover this, and offers to ask the community (Phase 2) or shows a "we'll write this up" acknowledgement.
- Suggested starter questions on the empty state, drawn from the tank's actual state — a 10-day-old tank gets cycling questions, a tank with an algae finding gets algae questions.
- Question history per tank, stored locally and searchable.
- **Thumbs up / down and a "this was wrong" path** on every answer, stored in `ai_interactions`. Reviewed weekly; corrections become new corpus entries.
- Quota counter shown honestly when approaching the free-tier limit — never a surprise wall.

## Out of scope

Multi-turn conversation with memory across sessions (single question with follow-ups is enough for v1). Voice input. Community answers.

## Rules

- Never a bare prose blob. Structured rendering only.
- An answer with no `grounding_refs` is a bug — surface it in development rather than shipping it silently.
- Answer in the language asked. Species, chemical, medication and parameter names always in English/Latin. See `docs/05-content-guide.md` §5.
- Never a dose without confirmed volume and inhabitants — the contract handles this, but verify it in testing.

## Acceptance criteria

1. Asking "can I add an angelfish?" returns an answer that names the actual tank's dimensions and current fish.
2. The answer shows what it was based on, visibly, without tapping anything.
3. Asking about a medication in a tank containing shrimp produces a critical warning naming the shrimp.
4. At least one answer offers a button that creates a reminder, and pressing it creates a real reminder.
5. Asking in Hinglish returns a Hinglish answer — with "ammonia", "pH" and species names still in English.
6. Every answer shows at least one tappable source that opens the right species card or corpus entry.
7. Marking an answer wrong stores the correction, viewable in the SQLite inspector.
8. On the free tier, approaching the limit shows the remaining count before the last question, not after.
9. With no network, the screen explains that Ask needs a connection and everything else in the app still works.
