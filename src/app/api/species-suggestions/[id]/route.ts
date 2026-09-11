import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { speciesSuggestions } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { nowIso } from "@/db/id";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await req.json();
  if (status !== "approved" && status !== "rejected") return NextResponse.json({ error: "invalid status" }, { status: 400 });

  await serverDb
    .update(speciesSuggestions)
    .set({ status, reviewedAt: nowIso() })
    .where(and(eq(speciesSuggestions.id, id), eq(speciesSuggestions.userId, userId)));
  return NextResponse.json({ ok: true });
}
