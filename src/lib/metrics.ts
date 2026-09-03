// Pure, offline metric calculations for the T-026 developer screen. Every
// function here takes rows already fetched from the local database and
// returns a plain number/object — no DB calls, no network, so this file is
// trivial to eyeball and to unit-test against seeded data. Definitions
// match specs/T-026-metrics-and-survival-prompt.md exactly; don't drift.
import type { tanks, livestock, logEntries, measurements, tasks, aiInteractions, scans } from "@/db/schema";

type Tank = typeof tanks.$inferSelect;
type Livestock = typeof livestock.$inferSelect;
type LogEntry = typeof logEntries.$inferSelect;
type Measurement = typeof measurements.$inferSelect;
type Task = typeof tasks.$inferSelect;
type AiInteraction = typeof aiInteractions.$inferSelect;
type Scan = typeof scans.$inferSelect;

const DAY_MS = 86400000;

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / DAY_MS;
}

/** Tanks with a log entry, measurement or completed task in the last 14 days. */
export function computeActiveTanks(
  tanksRows: Tank[],
  logEntryRows: LogEntry[],
  measurementRows: Measurement[],
  taskRows: Task[],
  now = new Date()
): { activeCount: number; totalCount: number } {
  const activeTankIds = new Set<string>();
  for (const e of logEntryRows) if (daysBetween(now, new Date(e.occurredAt)) <= 14) activeTankIds.add(e.tankId);
  for (const m of measurementRows) if (daysBetween(now, new Date(m.measuredAt)) <= 14) activeTankIds.add(m.tankId);
  for (const t of taskRows) if (t.lastDoneAt && daysBetween(now, new Date(t.lastDoneAt)) <= 14) activeTankIds.add(t.tankId);
  return { activeCount: activeTankIds.size, totalCount: tanksRows.length };
}

/**
 * Whether the *first* tank created was set up, scanned and logged within
 * 48h of app install — a single yes/no for "did this install activate."
 */
export function computeActivation(
  tanksRows: Tank[],
  scanRows: Scan[],
  logEntryRows: LogEntry[],
  installedAt: string | null
): { activated: boolean; reason: string } {
  if (!installedAt) return { activated: false, reason: "No install date recorded yet" };
  if (tanksRows.length === 0) return { activated: false, reason: "No tank created yet" };

  const firstTank = [...tanksRows].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const deadline = new Date(new Date(installedAt).getTime() + 48 * 60 * 60 * 1000);
  if (new Date(firstTank.createdAt) > deadline) return { activated: false, reason: "First tank created after the 48h window" };

  const scanForTank = scanRows.find((s) => s.tankId === firstTank.id && new Date(s.createdAt) <= deadline);
  if (!scanForTank) return { activated: false, reason: "No scan completed within 48h" };

  const logForTank = logEntryRows.find((l) => l.tankId === firstTank.id && new Date(l.occurredAt) <= deadline);
  if (!logForTank) return { activated: false, reason: "No log entry within 48h" };

  return { activated: true, reason: "Tank created, scanned and logged within 48h of install" };
}

/** Distinct calendar days (since install) with at least one log action — a log entry, measurement or completed task. */
export function computeLoggingRetentionDays(
  logEntryRows: LogEntry[],
  measurementRows: Measurement[],
  taskRows: Task[],
  installedAt: string | null
): number {
  if (!installedAt) return 0;
  const installDate = new Date(installedAt);
  const days = new Set<string>();
  const add = (iso: string) => {
    const d = new Date(iso);
    if (d >= installDate) days.add(d.toISOString().slice(0, 10));
  };
  for (const e of logEntryRows) add(e.occurredAt);
  for (const m of measurementRows) add(m.measuredAt);
  for (const t of taskRows) if (t.lastDoneAt) add(t.lastDoneAt);
  return days.size;
}

/** Thumbs-up, thumbs-down and "this was wrong" reports, each per 1,000 answers. */
export function computeAiTrust(interactions: AiInteraction[]): {
  totalAnswers: number;
  thumbsUpPer1000: number;
  thumbsDownPer1000: number;
  wrongReportsPer1000: number;
} {
  const total = interactions.length;
  if (total === 0) return { totalAnswers: 0, thumbsUpPer1000: 0, thumbsDownPer1000: 0, wrongReportsPer1000: 0 };
  const up = interactions.filter((i) => i.rating === 1).length;
  const down = interactions.filter((i) => i.rating === -1).length;
  const wrong = interactions.filter((i) => !!i.correctionText).length;
  const per1000 = (n: number) => Math.round((n / total) * 1000 * 10) / 10;
  return { totalAnswers: total, thumbsUpPer1000: per1000(up), thumbsDownPer1000: per1000(down), wrongReportsPer1000: per1000(wrong) };
}

/** Of livestock added more than 90 days ago, the proportion still marked alive. The one number no competitor claims. */
export function compute90DaySurvival(
  livestockRows: Livestock[],
  now = new Date()
): { eligibleCount: number; aliveCount: number; survivalPct: number | null } {
  const eligible = livestockRows.filter((l) => !l.deletedAt && daysBetween(now, new Date(l.addedOn)) >= 90);
  if (eligible.length === 0) return { eligibleCount: 0, aliveCount: 0, survivalPct: null };
  const alive = eligible.filter((l) => l.status === "alive").length;
  return { eligibleCount: eligible.length, aliveCount: alive, survivalPct: Math.round((alive / eligible.length) * 1000) / 10 };
}
