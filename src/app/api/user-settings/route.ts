import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { settingsTable } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";

// GET ?key=X -> { value: string | null }
// GET ?all=1 -> every key/value row for this user (export)
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const all = searchParams.get("all") === "1";

  if (all) {
    const rows = await serverDb.select().from(settingsTable).where(eq(settingsTable.userId, userId));
    return NextResponse.json(rows);
  }
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  const rows = await serverDb.select().from(settingsTable).where(and(eq(settingsTable.userId, userId), eq(settingsTable.key, key)));
  return NextResponse.json({ value: rows[0]?.value ?? null });
}

// POST { key, value } -> upsert
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  await serverDb
    .insert(settingsTable)
    .values({ userId, key, value })
    .onConflictDoUpdate({ target: [settingsTable.userId, settingsTable.key], set: { value } });
  return NextResponse.json({ ok: true });
}
