import { NextResponse } from "next/server";
import { eq, isNull, desc, and } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users, tanks, livestock, aiInteractions, scans, pageViews, appInstalls, logEntries } from "@/server/db/schema";
import { requireAdminUserId } from "@/server/auth/require-admin";

/**
 * Full per-account detail — profile, every tank, every AI interaction
 * (including the actual Ask AquaAI question/answer text — see the note in
 * ../route.ts and CLAUDE.md's Principle 4 record), scans, recent page
 * views, and install status. Admin-only (requireAdminUserId), and
 * deliberately not linked from anywhere in the regular app.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdminUserId();
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;

  const userRow = (await serverDb.select().from(users).where(eq(users.id, id)))[0];
  if (!userRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [tankRows, livestockRows, aiRows, scanRows, recentPageViews, installRows, journalRows] = await Promise.all([
    serverDb.select().from(tanks).where(eq(tanks.userId, id)).orderBy(desc(tanks.createdAt)),
    serverDb.select().from(livestock).where(eq(livestock.userId, id)),
    serverDb.select().from(aiInteractions).where(eq(aiInteractions.userId, id)).orderBy(desc(aiInteractions.createdAt)),
    serverDb.select().from(scans).where(eq(scans.userId, id)).orderBy(desc(scans.createdAt)),
    serverDb.select().from(pageViews).where(eq(pageViews.userId, id)).orderBy(desc(pageViews.createdAt)).limit(200),
    serverDb.select().from(appInstalls).where(eq(appInstalls.userId, id)).orderBy(desc(appInstalls.createdAt)),
    serverDb.select().from(logEntries).where(and(eq(logEntries.userId, id), isNull(logEntries.deletedAt))),
  ]);

  // A single chronological "actions" timeline — tanks created, scans run,
  // and every AI call, merged and sorted — so the account page reads as
  // one activity feed rather than four disconnected lists (Jaideep: "the
  // kind of actions done per account").
  const actions = [
    ...tankRows.map((t) => ({ at: t.createdAt, type: "tank_created", label: `Created tank "${t.name}"` })),
    ...scanRows.map((s) => ({ at: s.createdAt, type: "scan", label: "Ran a Tank Scan" })),
    ...aiRows.map((a) => ({ at: a.createdAt, type: "ai_call", label: `AI call: ${a.kind ?? "unknown"}` })),
    ...journalRows.map((j) => ({ at: j.createdAt, type: "journal_entry", label: "Added a journal entry" })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return NextResponse.json({
    account: { id: userRow.id, email: userRow.email, phone: userRow.phone, name: userRow.name, createdAt: userRow.createdAt },
    tanks: tankRows,
    livestockCount: livestockRows.filter((l) => l.status === "alive").length,
    aiInteractions: aiRows,
    scans: scanRows,
    pageViews: recentPageViews,
    installed: installRows.length > 0,
    installedAt: installRows[0]?.createdAt ?? null,
    actions,
  });
}
