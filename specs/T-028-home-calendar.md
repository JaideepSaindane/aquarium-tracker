# T-028 — Home / Cross-Tank Calendar

**REMOVED 2026-09-10** — this whole screen was a cross-tank reminders calendar, so it was deleted along with the rest of T-018 (Reminders) at Jaideep's direction. See `specs/PROGRESS.md`'s 2026-09-10 entry. Kept below for historical context only.

**Phase 1 · Depends on: T-016, T-018 · Size: 1–2 days**

## Goal

One screen that answers "what do I need to do today, across every tank I have" — without opening each tank's Schedule page one at a time.

## Why

Today, reminders only exist per-tank: `src/app/tank/[id]/schedule/page.tsx` buckets one tank's tasks into Overdue/Today/This week/Later. With more than one tank, there is no single place to see everything due — you'd have to check each tank's Schedule page separately. Jaideep's product vision named a calendar-first Home tab as the center of a 5-tab bottom nav; this spec is that screen, scoped as its own task rather than folded silently into the nav-restructure work already done (see `specs/PROGRESS.md`, 2026-09-01 nav entry) because aggregating tasks across tanks is real new logic, not a relabel.

## In scope

- **New route**, `src/app/(tabs)/home/page.tsx` — does not replace the existing My Tanks list at `/`, which stays its own tab. (Flagged as a decision: if it turns out Home should be the app's actual landing page instead of My Tanks, that's a follow-up routing change, not part of this task.)
- **Cross-tank task list**, reusing the existing bucketing logic (`bucketFor` in `src/app/tank/[id]/schedule/page.tsx` — Overdue / Today / This week / Later) applied to `listAllActiveTasks()` (already exists in `src/db/queries/tasks.ts`, no new query needed) instead of one tank's tasks.
- **Each row shows which tank it belongs to** (task rows on the per-tank Schedule page don't need this since the tank is implied; here it's the whole point) — join `tasks.tankId` to the tank's `name` for display, and link the row through to that tank's own Schedule page for editing.
- **Day / Week view toggle**, matching the vision doc's "View toggle (Day/Week) with Previous/Next arrows" — Day view shows just today's bucket with date navigation; Week view shows the existing four-bucket layout. Keep this simple: it's a display filter over the same task list, not a new data model.
- **Complete a task directly from Home** — reuse `completeTask` from `src/db/queries/tasks.ts` and the same `syncReminder`/`removeReminderSync` calls the per-tank Schedule page already makes, so completing from Home stays in sync with the server-side push mirror (see T-018's decision log entry on why that mirror exists).
- **Empty state**: no tanks yet → point at the same "scan a tank" / "add by hand" links the My Tanks empty state uses. Tanks exist but no tasks yet → a plain "Nothing scheduled — add a reminder from a tank's Schedule page" message (Home doesn't need its own "add reminder" form; that already lives per-tank and duplicating it risks the two getting out of sync).

## Out of scope

- Rescheduling or deleting a task from Home — link out to the tank's own Schedule page for that, don't rebuild the full task-editing UI twice.
- Any new task/reminder types beyond what already exists (water change, filter clean, dose, CO2 refill, trim, test water, custom).
- Changing what "/" routes to — My Tanks stays the default landing page for this task.

## Acceptance criteria

1. With reminders spread across two or more tanks, Home shows all of them in one list, correctly bucketed into Overdue/Today/This week/Later.
2. Each row on Home names which tank it's for, and tapping it goes to that tank's own Schedule page.
3. Tapping "Done" on a task from Home marks it complete and (for a recurring task) rolls it to its next due date — verified by checking the same task's due date updated correctly when you open that tank's own Schedule page afterward.
4. Switching to Day view and using the Previous/Next arrows moves one day at a time and only shows that day's tasks.
5. With zero tanks, Home shows the same "add a tank" prompts as the empty My Tanks screen, not a blank page.
6. With tanks but no reminders yet, Home says so plainly rather than looking broken or empty by accident.
