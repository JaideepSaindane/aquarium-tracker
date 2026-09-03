Work on task $ARGUMENTS.

Follow this exactly:

1. Read `CLAUDE.md` if you have not already this session.
2. Read `specs/$ARGUMENTS-*.md` and every spec it depends on.
3. Read any docs the spec references.
4. Check what already exists in the repo before writing anything new.
5. Do the work. Stay inside the spec's scope — if you find yourself needing something from a neighbouring task, stop and say so rather than expanding.
6. If you hit a genuine fork — two reasonable approaches with different tradeoffs — stop and ask in plain language, with the consequences of each spelled out. Jaideep is not a programmer; do not ask him to choose between things only a programmer could evaluate.
7. When done, list every acceptance criterion from the spec and say for each one: verified by you, or needs Jaideep to check on his phone. Be honest. A criterion you could not test is not passed.
8. Update `specs/PROGRESS.md`.
9. If you learned anything that contradicts the docs — a package that does not work, an API that changed — update that doc in the same session and say you did.

End with the exact commands Jaideep needs to run, and exactly what to tap to check the work.
