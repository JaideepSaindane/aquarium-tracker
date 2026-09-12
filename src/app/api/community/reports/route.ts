import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { communityReports } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { requireAdminUserId } from "@/server/auth/require-admin";
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

// Used only by the hidden /dev/community-reports viewer. Real per-role
// moderation still doesn't exist (T-030's own spec flags that gap) — but as
// of 2026-09-12's security review, this at least requires the same admin
// allowlist check as /api/admin/stats, not just "any signed-in account,"
// since the report reasons/targets are every user's, not the caller's own.
export async function GET() {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const rows = await serverDb.select().from(communityReports).orderBy(desc(communityReports.createdAt));
  return NextResponse.json(rows);
}
