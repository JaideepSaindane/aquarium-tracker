import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { communityPosts, communityComments, profile } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { nowIso } from "@/db/id";

function parsePhotoUris(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** One post, with joined author + comment count — used by the /community/[id] detail page. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const rows = await serverDb.select().from(communityPosts).where(and(eq(communityPosts.id, id), isNull(communityPosts.deletedAt)));
  const post = rows[0];
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const authorRows = await serverDb.select().from(profile).where(eq(profile.userId, post.userId));
  const author = authorRows[0]
    ? { name: authorRows[0].name, username: authorRows[0].username, photoUri: authorRows[0].photoUri }
    : { name: null, username: null, photoUri: null };

  const countRows = await serverDb
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(communityComments)
    .where(and(eq(communityComments.postId, id), isNull(communityComments.deletedAt)));

  return NextResponse.json({ ...post, photoUris: parsePhotoUris(post.photoUris), author, commentCount: countRows[0]?.count ?? 0 });
}

/** Soft-delete your own post — refuses (404, so as not to confirm another user's post exists) if you're not the author. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await serverDb
    .update(communityPosts)
    .set({ deletedAt: nowIso() })
    .where(and(eq(communityPosts.id, id), eq(communityPosts.userId, userId)))
    .returning({ id: communityPosts.id });

  if (result.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
