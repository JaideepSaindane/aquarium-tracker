import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { communityLikes } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

/** Toggles this user's like on a post — liking again is a no-op guarded by the unique (user, post) index, unliking deletes the row. Returns the new state so the client doesn't need a second round trip. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: postId } = await params;

  const existing = await serverDb.select().from(communityLikes).where(and(eq(communityLikes.userId, userId), eq(communityLikes.postId, postId)));

  if (existing.length > 0) {
    await serverDb.delete(communityLikes).where(and(eq(communityLikes.userId, userId), eq(communityLikes.postId, postId)));
  } else {
    await serverDb.insert(communityLikes).values({ id: newId(), userId, postId, createdAt: nowIso() });
  }

  const countRows = await serverDb
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(communityLikes)
    .where(eq(communityLikes.postId, postId));

  return NextResponse.json({ liked: existing.length === 0, likeCount: countRows[0]?.count ?? 0 });
}
