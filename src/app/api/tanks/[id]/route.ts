import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { tanks } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { nowIso } from "@/db/id";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rows = await serverDb
    .select()
    .from(tanks)
    .where(and(eq(tanks.id, id), eq(tanks.userId, userId), isNull(tanks.deletedAt)));
  if (!rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

// Fields a client is actually allowed to change via this route — everything
// else (id, userId, createdAt, deletedAt) is identity/audit state the
// server owns. A prior version spread the whole request body into the
// update, which let a signed-in user PATCH their own tank's `userId` to
// reassign it to a different account, or forge fields like `createdAt`.
const PATCHABLE_FIELDS = [
  "name",
  "photoUri",
  "lengthCm",
  "widthCm",
  "heightCm",
  "shape",
  "status",
  "waterType",
  "isPlanted",
  "hasCo2",
  "setupType",
  "city",
  "startedOn",
  "substrate",
  "notes",
  "archivedAt",
] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const patch = await req.json();
  const now = nowIso();
  const values: Record<string, unknown> = { updatedAt: now };
  for (const field of PATCHABLE_FIELDS) {
    if (field in patch) values[field] = patch[field];
  }
  if (patch.lengthCm && patch.widthCm && patch.heightCm) {
    values.volumeL = Math.round(((patch.lengthCm * patch.widthCm * patch.heightCm) / 1000) * 10) / 10;
  }
  await serverDb.update(tanks).set(values).where(and(eq(tanks.id, id), eq(tanks.userId, userId)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  await serverDb.update(tanks).set({ deletedAt: nowIso() }).where(and(eq(tanks.id, id), eq(tanks.userId, userId)));
  return NextResponse.json({ ok: true });
}
