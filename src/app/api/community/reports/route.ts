import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { communityReports } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const targetType = input.targetType === "post" || input.targetType === "comment" ? input.targetType : null;
  const targetId = String(input.targetId ?? "");
  if (!targetType || !targetId) return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });

  await serverDb.insert(communityReports).values({
    id: newId(),
    reporterUserId: userId,
    targetType,
    targetId,
    reason: input.reason ? String(input.reason).trim() || null : null,
    createdAt: nowIso(),
  });
  return NextResponse.json({ ok: true });
}

// Used only by the hidden /dev/community-reports viewer. No separate admin
// role exists in this app yet (2026-09-11 MVP scope) — any signed-in
// account can read this. Acceptable for a hidden, unlinked dev URL at this
// stage; a real limitation to revisit if the community grows before real
// moderation roles exist.
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await serverDb.select().from(communityReports).orderBy(desc(communityReports.createdAt));
  return NextResponse.json(rows);
}
