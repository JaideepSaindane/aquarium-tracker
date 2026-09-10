import { eq } from "drizzle-orm";
import { db } from "../client";
import { dismissedWarnings } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

// Principle 01: warnings are dismissible AND remembered — without this table
// a compatibility warning re-fires every time the tank is opened, which is
// the nagging that makes people uninstall. warningKey must be deterministic
// so the same warning is recognised across sessions (docs/02-data-model.md).
export async function isWarningDismissed(warningKey: string): Promise<boolean> {
  const rows = await db.select().from(dismissedWarnings).where(eq(dismissedWarnings.warningKey, warningKey));
  return rows.length > 0;
}

export async function dismissWarning(params: { tankId?: string; livestockId?: string; warningKey: string }) {
  await db.insert(dismissedWarnings).values({
    id: newId(),
    tankId: params.tankId,
    livestockId: params.livestockId,
    warningKey: params.warningKey,
    dismissedAt: nowIso(),
  });
  notifyChanged();
}

/**
 * Deterministic key for a compat conflict — same conflict type/pair always
 * produces the same key. `newSpeciesIds` is an array (2026-09-10: the
 * compat check moved from per-fish to one batch check covering every
 * species added in a session, since a real conflict can involve more than
 * one newly-added fish at once) — order doesn't matter, so it's sorted
 * before joining. Note: this changes the key format from the old
 * single-species version, so any warning dismissed before this change will
 * show again once, then dismiss normally.
 */
export function compatWarningKey(newSpeciesIds: string[], conflictType: string, withSpeciesIds: string[]): string {
  return `compat:${[...newSpeciesIds].sort().join(",")}:${conflictType}:${[...withSpeciesIds].sort().join(",")}`;
}
