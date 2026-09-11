import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { communityComments } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { nowIso } from "@/db/id";

/** Soft-delete your own comment — refuses (404) if you're not the author. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await serverDb
    .update(communityComments)
    .set({ deletedAt: nowIso() })
    .where(and(eq(communityComments.id, id), eq(communityComments.userId, userId)))
    .returning({ id: communityComments.id });

  if (result.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
