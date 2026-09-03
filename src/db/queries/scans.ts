import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { scans } from "../schema";
import { newId, nowIso } from "../id";
import { notifyChanged } from "../live";

export type NewScan = {
  tankId: string;
  imageUri: string;
  modelName: string;
  modelVersion?: string;
  promptVersion: string;
  rawResponse: unknown;
  findings?: unknown;
  scores?: unknown;
  userCorrections?: unknown;
};

/** The full raw_response is kept forever — it's the evaluation set (specs/T-015). */
export async function createScan(input: NewScan) {
  const now = nowIso();
  const id = newId();
  await db.insert(scans).values({
    id,
    tankId: input.tankId,
    imageUri: input.imageUri,
    modelName: input.modelName,
    modelVersion: input.modelVersion,
    promptVersion: input.promptVersion,
    rawResponse: JSON.stringify(input.rawResponse),
    findings: input.findings ? JSON.stringify(input.findings) : null,
    scores: input.scores ? JSON.stringify(input.scores) : null,
    userCorrections: input.userCorrections ? JSON.stringify(input.userCorrections) : null,
    createdAt: now,
  });
  notifyChanged();
  return id;
}

export async function listScansForTank(tankId: string) {
  return db.select().from(scans).where(eq(scans.tankId, tankId)).orderBy(desc(scans.createdAt));
}

/** Every scan across every tank — used by the T-026 activation metric (tank + scan within 48h of install). */
export async function listAllScans() {
  return db.select().from(scans);
}
