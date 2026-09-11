import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { aiInteractions } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  await serverDb
    .update(aiInteractions)
    .set({ rating: body.rating, correctionText: body.correctionText })
    .where(and(eq(aiInteractions.id, id), eq(aiInteractions.userId, userId)));
  return NextResponse.json({ ok: true });
}
