import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { parameterDefs } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// Only real per-tank overrides/custom parameters live here — the 8 global
// defaults are a client-side constant now (src/lib/standard-parameters.ts),
// not database rows. GET ?tankId=X -> every override/custom row for that tank.
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tankId = searchParams.get("tankId");
  const all = searchParams.get("all") === "1";
  if (!tankId && !all) return NextResponse.json({ error: "tankId is required" }, { status: 400 });

  const conditions = [eq(parameterDefs.userId, userId)];
  if (tankId) conditions.push(eq(parameterDefs.tankId, tankId));
  const rows = await serverDb.select().from(parameterDefs).where(and(...conditions));
  return NextResponse.json(rows);
}

// POST { tankId, name, unit, targetMin, targetMax, decimals, sortOrder } ->
// upsert-by-(tankId, name), same as the old setTankParameterTarget/
// addCustomParameter pair (one endpoint, since both are "does a row with
// this tank+name exist yet").
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();

  const existing = (
    await serverDb
      .select()
      .from(parameterDefs)
      .where(and(eq(parameterDefs.userId, userId), eq(parameterDefs.tankId, input.tankId), eq(parameterDefs.name, input.name)))
  )[0];

  if (existing) {
    await serverDb
      .update(parameterDefs)
      .set({ targetMin: input.targetMin, targetMax: input.targetMax, updatedAt: now })
      .where(eq(parameterDefs.id, existing.id));
    return NextResponse.json({ id: existing.id });
  }

  const id = newId();
  await serverDb.insert(parameterDefs).values({
    id,
    userId,
    tankId: input.tankId,
    name: input.name,
    unit: input.unit,
    targetMin: input.targetMin,
    targetMax: input.targetMax,
    decimals: input.decimals ?? 1,
    sortOrder: input.sortOrder ?? 99,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id });
}
