# T-004 — Content corpus structure and in-app reader

**Phase 0 · Depends on: nothing (runs alongside T-001–T-003) · Size: 1 day of setup, then ongoing writing**

## Goal

Give the 60 safety topics a real home on disk, a validator, stable ids, and a screen in the app that can display one. Without this, every `grounding_refs` citation in the AI contracts points at nothing.

## Why

`docs/03-ai-contracts.md` requires every AI answer to cite corpus entries, and T-015 and T-019 both require that tapping a citation opens the entry. The corpus is the product's actual moat and its main safety mechanism — but until it has a file layout and an id scheme, nothing can retrieve from it and nothing can link to it.

## In scope

**Repository structure:**

```
content/
  corpus/
    ich-white-spot.md
    ammonia-spike.md
    ph-ammonia-trap.md
    nitrogen-cycle.md
    ... one file per topic, id as filename
  schema/
    traits.yml            # the trait keywords used by applies_to and incompatible_with
```

- One markdown file per topic, frontmatter per the template in `docs/05-content-guide.md` §3.
- Stable kebab-case ids matching the filename. Ids never change once shipped — they are cited in stored AI responses.
- **A validator script** that checks: every file's frontmatter matches the template; every required field is present; `severity`, `time_to_act` and review-tier values are from their allowed sets; every `sources[]` entry is a URL; every trait in `applies_to` exists in `traits.yml`; `last_reviewed_by` is non-empty for any entry marked live; and no two files share an id.
- **A build step that refuses to ship** an entry marked live without a named reviewer. This is the enforcement `docs/05-content-guide.md` §7 requires.
- A manifest generated from the corpus (`content/corpus.index.json`) listing id, title, aliases, severity and tier — this is what the proxy loads for retrieval in T-013.
- **An in-app corpus reader route** (`app/corpus/[id].tsx`): renders one entry with its symptoms, immediate actions, the "do not" list rendered as prominently as the actions, treatment options with their inhabitant warnings, sources, and the review tier and date. This is what `GroundingLink` opens.
- The reader works offline — the corpus ships inside the app bundle, not fetched.

## Out of scope

Writing the 60 topics. That is Jaideep's ongoing work and is tracked separately in `PROGRESS.md`. This task builds the container.

## The two entries that must exist first

`docs/05-content-guide.md` §4 contains two complete worked examples — ich/white spot and ammonia spike. Move them into `content/corpus/` as the first two real files and validate against them. If the template does not survive contact with its own examples, the template is wrong.

## Acceptance criteria

1. `content/corpus/` contains at least the two worked example entries as separate files.
2. Running the validator passes on both and prints a clear summary.
3. Deliberately removing a required field from one file makes the validator fail with a message naming the file and the field.
4. Marking an entry live with an empty `last_reviewed_by` makes the build fail.
5. `content/corpus.index.json` is generated and lists both entries.
6. Opening `/corpus/ich-white-spot` in the app shows the entry, with the "do not" list as visually prominent as the actions.
7. The corpus reader works in aeroplane mode.
8. These five ids resolve, because they are cited elsewhere in the project: `ich-white-spot`, `ammonia-spike`, `ph-ammonia-trap`, `nitrogen-cycle`, `temperature-swings`.
