import { NextResponse } from "next/server";
import { and, eq, isNull, desc } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { measurements } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// ?tankId=X                  -> listMeasurementsForTank
// ?tankId=X&parameterId=Y    -> listMeasurementsForParam (sorted newest first)
// ?all=1                     -> listAllMeasurements
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tankId = searchParams.get("tankId");
  const parameterId = searchParams.get("parameterId");
  const all = searchParams.get("all") === "1";

  const conditions = [eq(measurements.userId, userId)];
  if (tankId) conditions.push(eq(measurements.tankId, tankId));
  if (parameterId) conditions.push(eq(measurements.parameterId, parameterId));
  if (!all) conditions.push(isNull(measurements.deletedAt));

  const query = serverDb.select().from(measurements).where(and(...conditions));
  const rows = parameterId ? await query.orderBy(desc(measurements.measuredAt)) : await query;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const id = newId();
  await serverDb.insert(measurements).values({
    id,
    userId,
    tankId: input.tankId,
    parameterId: input.parameterId,
    value: input.value,
    measuredAt: input.measuredAt ?? now,
    method: input.method ?? "liquid_kit",
    note: input.note,
    createdAt: now,
  });
  return NextResponse.json({ id });
}
