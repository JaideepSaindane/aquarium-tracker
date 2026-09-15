import { NextResponse } from "next/server";
import { sql, isNull } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users, tanks, aiInteractions, pageViews, appInstalls, scans } from "@/server/db/schema";
import { requireAdminDashSession } from "@/server/auth/require-admin-dash";

/**
 * Per-account summary list for the admin dashboard's account-wise page
 * (2026-09-15, Jaideep: "an account-wise page... how many tanks were
 * created per account, the API usage per account"). Unlike /api/admin/stats
 * (aggregate-only, per T-030's original scope), this route and
 * /api/admin/accounts/[id] deliberately DO expose individual-account
 * detail — a scope change from the original "never shows an individual
 * user's own content" rule, made deliberately at Jaideep's explicit
 * request; see CLAUDE.md's Principle 4 note for the record of that
 * decision.
 */
export async function GET() {
  if (!(await requireAdminDashSession())) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const allUsers = await serverDb
    .select({ id: users.id, email: users.email, phone: users.phone, name: users.name, createdAt: users.createdAt })
    .from(users)
    .orderBy(sql`${users.createdAt} desc`);

  const [tankCounts, aiCounts, pageViewCounts, installRows, scanCounts, lastAiRows, lastPageViewRows] = await Promise.all([
    serverDb.select({ userId: tanks.userId, n: sql<number>`count(*)`.mapWith(Number) }).from(tanks).where(isNull(tanks.deletedAt)).groupBy(tanks.userId),
    serverDb.select({ userId: aiInteractions.userId, n: sql<number>`count(*)`.mapWith(Number) }).from(aiInteractions).groupBy(aiInteractions.userId),
    serverDb.select({ userId: pageViews.userId, n: sql<number>`count(*)`.mapWith(Number) }).from(pageViews).groupBy(pageViews.userId),
    serverDb.select({ userId: appInstalls.userId }).from(appInstalls).groupBy(appInstalls.userId),
    serverDb.select({ userId: scans.userId, n: sql<number>`count(*)`.mapWith(Number) }).from(scans).groupBy(scans.userId),
    serverDb.select({ userId: aiInteractions.userId, last: sql<string>`max(${aiInteractions.createdAt})` }).from(aiInteractions).groupBy(aiInteractions.userId),
    serverDb.select({ userId: pageViews.userId, last: sql<string>`max(${pageViews.createdAt})` }).from(pageViews).groupBy(pageViews.userId),
  ]);

  const toMap = <T extends { userId: string | null }>(rows: T[]) => new Map(rows.filter((r) => r.userId).map((r) => [r.userId as string, r]));
  const tankMap = toMap(tankCounts);
  const aiMap = toMap(aiCounts);
  const pvMap = toMap(pageViewCounts);
  const installedSet = new Set(installRows.map((r) => r.userId));
  const scanMap = toMap(scanCounts);
  const lastAiMap = toMap(lastAiRows);
  const lastPvMap = toMap(lastPageViewRows);

  const accounts = allUsers.map((u) => {
    const lastAi = lastAiMap.get(u.id)?.last ?? null;
    const lastPv = lastPvMap.get(u.id)?.last ?? null;
    const lastActive = [lastAi, lastPv].filter(Boolean).sort().at(-1) ?? null;
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      name: u.name,
      createdAt: u.createdAt,
      tankCount: tankMap.get(u.id)?.n ?? 0,
      aiInteractionCount: aiMap.get(u.id)?.n ?? 0,
      scanCount: scanMap.get(u.id)?.n ?? 0,
      pageViewCount: pvMap.get(u.id)?.n ?? 0,
      installed: installedSet.has(u.id),
      lastActiveAt: lastActive,
    };
  });

  return NextResponse.json({ accounts });
}
