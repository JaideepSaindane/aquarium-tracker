import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { communityCommentLikes } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

/** Toggles this user's like on a comment — same shape as /api/community/posts/[id]/like, just keyed by commentId. Liking again is a no-op guarded by the unique (user, comment) index, unliking deletes the row. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: commentId } = await params;

  const existing = await serverDb
    .select()
    .from(communityCommentLikes)
    .where(and(eq(communityCommentLikes.userId, userId), eq(communityCommentLikes.commentId, commentId)));

  if (existing.length > 0) {
    await serverDb
      .delete(communityCommentLikes)
      .where(and(eq(communityCommentLikes.userId, userId), eq(communityCommentLikes.commentId, commentId)));
  } else {
    await serverDb.insert(communityCommentLikes).values({ id: newId(), userId, commentId, createdAt: nowIso() });
  }

  const countRows = await serverDb
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(communityCommentLikes)
    .where(eq(communityCommentLikes.commentId, commentId));

  return NextResponse.json({ liked: existing.length === 0, likeCount: countRows[0]?.count ?? 0 });
}
