import { NextResponse } from "next/server";
import { and, isNull, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { tanks } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await serverDb.select().from(tanks).where(and(eq(tanks.userId, userId), isNull(tanks.deletedAt)));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const volumeL = Math.round(((input.lengthCm * input.widthCm * input.heightCm) / 1000) * 10) / 10;
  const id = newId();
  await serverDb.insert(tanks).values({
    id,
    userId,
    name: input.name,
    lengthCm: input.lengthCm,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    volumeL,
    shape: input.shape,
    waterType: input.waterType ?? "fresh",
    city: input.city,
    isPlanted: input.isPlanted ?? false,
    hasCo2: input.hasCo2 ?? false,
    startedOn: input.startedOn,
    substrate: input.substrate,
    status: input.status ?? "active",
    setupType: input.setupType,
    photoUri: input.photoUri,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id });
}
