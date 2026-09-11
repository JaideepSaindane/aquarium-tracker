import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { equipment } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { nowIso } from "@/db/id";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  await serverDb
    .update(equipment)
    .set({ deletedAt: nowIso() })
    .where(and(eq(equipment.id, id), eq(equipment.userId, userId)));
  return NextResponse.json({ ok: true });
}
