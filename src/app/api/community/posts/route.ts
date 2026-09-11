import { NextResponse } from "next/server";
import { desc, inArray, isNull, sql } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { communityPosts, communityComments, profile } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

const PAGE_SIZE = 50;

function parsePhotoUris(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function attachAuthors<T extends { userId: string }>(rows: T[]) {
  if (rows.length === 0) return rows.map((r) => ({ ...r, author: null as null | { name: string | null; username: string | null; photoUri: string | null } }));
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const profiles = await serverDb.select().from(profile).where(inArray(profile.userId, userIds));
  const byUserId = new Map(profiles.map((p) => [p.userId, p]));
  return rows.map((r) => {
    const p = byUserId.get(r.userId);
    return { ...r, author: { name: p?.name ?? null, username: p?.username ?? null, photoUri: p?.photoUri ?? null } };
  });
}

// Most recent 50 posts, each with joined author info and a comment count.
// No cursor pagination yet — a known, deliberate MVP limit (see the
// community plan/spec).
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await serverDb
    .select()
    .from(communityPosts)
    .where(isNull(communityPosts.deletedAt))
    .orderBy(desc(communityPosts.createdAt))
    .limit(PAGE_SIZE);

  const counts = await serverDb
    .select({ postId: communityComments.postId, count: sql<number>`count(*)`.mapWith(Number) })
    .from(communityComments)
    .where(isNull(communityComments.deletedAt))
    .groupBy(communityComments.postId);
  const countByPostId = new Map(counts.map((c) => [c.postId, c.count]));

  const withAuthors = await attachAuthors(rows);
  const withCounts = withAuthors.map((r) => ({
    ...r,
    photoUris: parsePhotoUris(r.photoUris),
    commentCount: countByPostId.get(r.id) ?? 0,
  }));
  return NextResponse.json(withCounts);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const body = String(input.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const photoUris: string[] = Array.isArray(input.photoUris) ? input.photoUris.map(String).slice(0, 10) : [];

  const now = nowIso();
  const id = newId();
  await serverDb.insert(communityPosts).values({
    id,
    userId,
    body,
    photoUris: photoUris.length > 0 ? JSON.stringify(photoUris) : null,
    createdAt: now,
  });
  return NextResponse.json({ id });
}
