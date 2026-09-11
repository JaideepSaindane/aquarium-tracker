import { NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { communityComments, profile } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: postId } = await params;

  const rows = await serverDb
    .select()
    .from(communityComments)
    .where(and(eq(communityComments.postId, postId), isNull(communityComments.deletedAt)))
    .orderBy(asc(communityComments.createdAt));

  if (rows.length === 0) return NextResponse.json([]);
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const profiles = await serverDb.select().from(profile).where(inArray(profile.userId, userIds));
  const byUserId = new Map(profiles.map((p) => [p.userId, p]));
  const withAuthors = rows.map((r) => {
    const p = byUserId.get(r.userId);
    return { ...r, author: { name: p?.name ?? null, username: p?.username ?? null, photoUri: p?.photoUri ?? null } };
  });
  return NextResponse.json(withAuthors);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: postId } = await params;
  const input = await req.json();
  const body = String(input.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const now = nowIso();
  const id = newId();
  await serverDb.insert(communityComments).values({ id, userId, postId, body, createdAt: now });
  return NextResponse.json({ id });
}
