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

const PROFILE_FIELDS = ["name", "username", "city", "email", "contact", "photoUri", "onboardingCompletedAt"] as const;

export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  // Only touch fields the caller actually sent — a caller that only ever
  // knows about a subset of fields (e.g. onboarding only sends
  // name/city/onboardingCompletedAt) must not silently wipe the others.
  const provided: Record<string, unknown> = {};
  for (const field of PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) provided[field] = input[field];
  }
  const existing = (await serverDb.select().from(profile).where(eq(profile.userId, userId)))[0];
  if (existing) {
    await serverDb
      .update(profile)
      .set({ ...provided, updatedAt: now })
      .where(eq(profile.userId, userId));
  } else {
    await serverDb.insert(profile).values({
      userId,
      ...provided,
      createdAt: now,
      updatedAt: now,
    });
  }
  return NextResponse.json({ ok: true });
}
