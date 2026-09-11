import { NextResponse } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { scans } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// GET modes (mirrors the old local query file):
//   ?tankId=X   -> listScansForTank (most recent first)
//   ?all=1      -> listAllScans (T-026 activation metric)
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tankId = searchParams.get("tankId");
  const all = searchParams.get("all") === "1";

  const rows = tankId
    ? await serverDb.select().from(scans).where(and(eq(scans.userId, userId), eq(scans.tankId, tankId))).orderBy(desc(scans.createdAt))
    : all
      ? await serverDb.select().from(scans).where(eq(scans.userId, userId))
      : [];
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const id = newId();
  await serverDb.insert(scans).values({
    id,
    userId,
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
  return NextResponse.json({ id });
}
