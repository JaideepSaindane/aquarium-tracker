import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { plants } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tankId = searchParams.get("tankId");
  if (!tankId) return NextResponse.json({ error: "tankId is required" }, { status: 400 });

  const rows = await serverDb
    .select()
    .from(plants)
    .where(and(eq(plants.userId, userId), eq(plants.tankId, tankId), isNull(plants.deletedAt)));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const id = newId();
  await serverDb.insert(plants).values({
    id,
    userId,
    tankId: input.tankId,
    speciesId: input.speciesId,
    commonName: input.commonName,
    quantity: input.quantity ?? 1,
    lightNeed: input.lightNeed,
    co2Need: input.co2Need,
    plantedOn: input.plantedOn ?? now,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id });
}
