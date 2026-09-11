import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { equipment } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tankId = searchParams.get("tankId");
  const all = searchParams.get("all") === "1";
  if (!tankId && !all) return NextResponse.json({ error: "tankId is required" }, { status: 400 });

  const conditions = [eq(equipment.userId, userId), isNull(equipment.deletedAt)];
  if (tankId) conditions.push(eq(equipment.tankId, tankId));
  const rows = await serverDb.select().from(equipment).where(and(...conditions));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const id = newId();
  await serverDb.insert(equipment).values({
    id,
    userId,
    tankId: input.tankId,
    type: input.type,
    subtype: input.subtype,
    brand: input.brand,
    model: input.model,
    wattage: input.wattage,
    ratedLph: input.ratedLph,
    installedOn: input.installedOn ?? now,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id });
}
