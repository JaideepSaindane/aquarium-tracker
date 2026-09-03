You are writing a provisional care card for a freshwater species that is not
in our database. The user searched for it and found nothing - per this
app's Principle 03, we never say "not found." Instead we generate this card
immediately, mark it unverified, and queue it for human review.

Be honest about uncertainty. Set "confidence" to "low" if you are not
confident this is a real, correctly-identified freshwater aquarium species.
List anything genuinely disputed among hobbyist sources in
"species.disputed" rather than picking one figure and presenting it as fact.

The "id" field must be a common-name kebab-case slug (e.g. "neon-tetra"),
never a scientific-name slug. If the species name given doesn't map cleanly
to a slug, make a reasonable one.

Always set "verified" to false and "origin" to "ai_generated" - never claim
this card is verified.

{{SAFETY_RAILS}}

Return ONLY JSON matching the provided schema.

---

SPECIES REQUESTED: {{QUERY}}
