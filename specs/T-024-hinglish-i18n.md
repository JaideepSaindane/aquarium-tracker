# T-024 — Hinglish and i18n

**Phase 1 · Depends on: T-010 · Size: 1–2 days**

## Goal

The whole app available in English and Hinglish, with technical terms that never get translated.

## Why

The primary audience — the anxious Indian beginner — googles in English and thinks in Hinglish. Retrofitting localisation after twenty screens exist costs several times what doing it now costs. And there is a safety dimension: a translated or transliterated word for "ammonia" is dangerous.

**Hindi in Devanagari script is deliberately out of scope.** Hinglish in Latin script is how this audience actually types. Devanagari doubles content QA for a fraction of the reach.

## In scope

- An i18n library set up from the first screen. All user-facing strings go through it — no literals in components.
- Two locales: `en` and `hi-Latn` (Hinglish).
- **The hard rule, enforced in both UI strings and AI output:** species names, scientific names, chemical names, medication names, parameter names and units stay in English/Latin in every locale. "Aapke tank mein ammonia 2 ppm hai — ye bahut zyada hai" is right. A translated word for ammonia is wrong and dangerous. Full rules and worked examples in `docs/05-content-guide.md` §5.
- Language detection for AI calls: reply in the language the question was asked in, regardless of the app's UI setting. Someone may set the app to English and still type a Hinglish question.
- A Hinglish tone sample set included in the AI system prompts. Without examples, models drift into either formal Hindi or pure English.
- Number, date and unit formatting per locale — but **units stay metric in storage** always, converted only for display.
- Language switch in Settings that applies immediately without a restart.

## Out of scope

Devanagari Hindi. Any other language. Right-to-left support (Hinglish is Latin script, so none is needed).

## Layout consequence

**Hinglish strings run roughly 15–25% longer than English.** Do not build layouts that only fit the English string. Every screen must be checked with the longest translation — this is the most common way localisation breaks a UI.

## Acceptance criteria

1. Switching to Hinglish in Settings changes the whole interface immediately, with no restart.
2. No screen has text that overflows, truncates or overlaps in Hinglish. Check every screen.
3. Species names, "ammonia", "pH", "nitrite" and medication names appear in English in both locales.
4. Asking a question in Hinglish while the app is set to English returns a Hinglish answer.
5. Asking a question in English while the app is set to Hinglish returns an English answer.
6. Searching for a species by its Hinglish or Indian shop name finds it.
7. No hard-coded user-facing string remains anywhere in the components — grep for quoted English text and confirm.
8. Temperatures display in °C and volumes in litres by default for an Indian device, with the option to switch.

## Notes for Claude Code

Have a native Hinglish speaker read the strings before launch. Machine-generated Hinglish reads as either stilted Hindi or as English with occasional Hindi words dropped in, and both are immediately obvious to the audience. Flag this for Jaideep rather than assuming the generated strings are fine.
