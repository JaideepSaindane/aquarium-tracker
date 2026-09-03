# T-021 — Species Dex

**Phase 1 · Depends on: T-011, T-016 · Size: 2 days**

## Goal

A collectable card for every species, unlocked by actually keeping it. The app's small piece of delight, and a free distribution loop.

## Why

Cheap to build, genuinely charming, and the shareable card image is organic marketing — someone posting "just unlocked my first pearl gourami" with a card bearing their tank's name is a free install. It also gives the species database a reason to be browsed rather than only searched.

## In scope

- A Dex grid: unlocked cards in colour, locked ones as silhouettes with the name hidden.
- **The card face carries the full care information and is never gated.** Principle 02. Unlock the art and the collection, never the facts — a locked card still opens a full species page.
- Unlock triggers: adding a species to a tank, or a scan detecting it. Record `unlock_source` and `times_kept`.
- **An unlock moment worth having.** This is the one place in the app where a real animation is warranted (`docs/04-design-system.md` § Motion). Respect reduce-motion.
- Card design: species art or the user's own first photo of it, common name, scientific name, key care ranges, rarity tier, and — when the user has kept one — "kept since March 2026".
- **The `disputed` field is displayed on the species page**, not hidden. Where reputable sources disagree — angelfish minimum volume is 110 L or 200 L depending who you ask — say so in the user's own words. This is the honesty surface of the product and the direct answer to Aquareka's *"Goldfish need 70L not 57L"* review. A range with an explanation beats a confident wrong number.
- **Share as an image.** Rendered card, tank name optional, small app mark. This is the distribution loop; make the image genuinely good.
- Provisional AI-generated species get a visibly distinct "unverified" card treatment — honest, not hidden.
- Rarity tiers assigned in the seed data. Keep it about how commonly the species is kept, not about difficulty or price.
- Filter and search: unlocked / all, by category, by difficulty, by whether it suits the user's tanks.

## Out of scope

Trading cards between users. Leaderboards (see below). Purchasable cards — never.

## The leaderboard question

The original brief asked for a leaderboard. **Do not rank by collection size.** A leaderboard that rewards collecting species incentivises overstocking and impulse buying in a hobby where that kills animals — a direct violation of Principle 06.

If ranking is added later, rank **care**: logging consistency, parameter stability, tank age, fish kept thriving past twelve months. "Longest-running tank" is a leaderboard this hobby would respect. Nothing in this task should make a collection-size leaderboard easier to add later.

## Acceptance criteria

1. Adding a species to a tank unlocks its card, with an animation.
2. A locked card can still be opened and shows complete care information, with no payment prompt.
3. Sharing a card produces an image that looks good in WhatsApp.
4. An AI-generated provisional species shows a visually distinct unverified card.
5. Turning on the phone's reduce-motion setting removes the unlock animation without breaking the flow.
6. The Dex works fully offline.
7. Nothing anywhere in the Dex ranks users by how many species they own.
