Audit the current state of the project against its own rules. Do not write code.

Check and report on:

1. **Principles** — does anything in the codebase violate the six principles in `CLAUDE.md`? Specifically: anything that blocks a save, anything that paywalls species data, disease content, emergency triage, export or livestock deletion, and anything that says "not found" without offering a provisional card.
2. **Offline** — is there any screen that fails without a network, other than Ask, Tank Scan and triage?
3. **Stack rules** — any import from `@react-navigation/*`, any package installed with plain `npm install`, any local SQLite data wrapped in TanStack Query, any hard-coded colour or font size in a component.
4. **Secrets** — any API key present in the app code or committed anywhere.
5. **Strings** — any user-facing text not going through the i18n layer.
6. **AI contracts** — any AI response rendered as raw prose, or returned without `grounding_refs`.
7. **Notifications** — is `USE_EXACT_ALARM` declared anywhere? It must not be.
8. **PROGRESS.md** — does it match reality, or does it claim things are done that are not?

Report findings most serious first, in plain language, with the file and line for each. Say clearly if everything is clean — do not invent problems to seem thorough.
