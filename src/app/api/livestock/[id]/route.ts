import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { livestock, livestockEvents } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// One PATCH endpoint, dispatched by `action` — mirrors the old local query
// file's several small mutation functions (updateCount/arrive/death/remove).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const now = nowIso();
  const where = and(eq(livestock.id, id), eq(livestock.userId, userId));

  switch (body.action) {
    case "updateCount":
      await serverDb.update(livestock).set({ count: body.count, updatedAt: now }).where(where);
      break;
    case "arrive":
      await serverDb.update(livestock).set({ status: "alive", addedOn: now, updatedAt: now }).where(where);
      await serverDb.insert(livestockEvents).values({ id: newId(), userId, livestockId: id, type: "added", occurredAt: now, createdAt: now });
      break;
    case "death":
      await serverDb.update(livestock).set({ status: "died", deathCause: body.cause, removedOn: now, updatedAt: now }).where(where);
      await serverDb.insert(livestockEvents).values({ id: newId(), userId, livestockId: id, type: "died", occurredAt: now, note: body.cause, createdAt: now });
      break;
    case "remove":
      await serverDb.update(livestock).set({ deletedAt: now }).where(where);
      break;
    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
