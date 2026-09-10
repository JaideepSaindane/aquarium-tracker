import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { profile } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { nowIso } from "@/db/id";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await serverDb.select().from(profile).where(eq(profile.userId, userId));
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const existing = (await serverDb.select().from(profile).where(eq(profile.userId, userId)))[0];
  if (existing) {
    await serverDb
      .update(profile)
      .set({ name: input.name, username: input.username, city: input.city, email: input.email, contact: input.contact, photoUri: input.photoUri, updatedAt: now })
      .where(eq(profile.userId, userId));
  } else {
    await serverDb.insert(profile).values({
      userId,
      name: input.name,
      username: input.username,
      city: input.city,
      email: input.email,
      contact: input.contact,
      photoUri: input.photoUri,
      createdAt: now,
      updatedAt: now,
    });
  }
  return NextResponse.json({ ok: true });
}
