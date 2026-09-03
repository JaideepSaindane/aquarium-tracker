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

/** Deterministic key for a compat conflict — same conflict type/pair always produces the same key. */
export function compatWarningKey(newSpeciesId: string, conflictType: string, withSpeciesIds: string[]): string {
  return `compat:${newSpeciesId}:${conflictType}:${[...withSpeciesIds].sort().join(",")}`;
}
