import { NextResponse } from "next/server";
import { sql, isNull } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import {
  users,
  tanks,
  livestock,
  aiInteractions,
  scans,
  logEntries,
  communityPosts,
  communityComments,
  communityLikes,
  communityReports,
} from "@/server/db/schema";
import { requireAdminUserId } from "@/server/auth/require-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a tiny generic count helper genuinely needs to accept any Drizzle table/condition; typing it precisely would need more ceremony than this internal aggregation helper is worth.
async function count(table: any, whereClause?: any): Promise<number> {
  const query = serverDb.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(table);
  const rows = whereClause ? await query.where(whereClause) : await query;
  return rows[0]?.n ?? 0;
}

/**
 * Aggregate, account-agnostic usage numbers only (2026-09-11, Jaideep: "a
 * dashboard for me to track overall usage, number of accounts, what
 * they're doing") — deliberately does NOT expose any individual user's
 * own tank/fish/journal/AI-chat content, per T-030's own spec ("read-only
 * reporting surface, not a support tool" / CLAUDE.md's "their data is
 * theirs"). Counts and small breakdowns only.
 */
export async function GET() {
  const adminId = await requireAdminUserId();
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const [
    totalUsers,
    phoneUsers,
    googleUsers,
    bothUsers,
    totalTanks,
    aliveLivestock,
    totalScans,
    totalAiInteractions,
    totalJournalEntries,
    totalPosts,
    totalComments,
    totalLikes,
    pendingReports,
  ] = await Promise.all([
    count(users),
    count(users, sql`${users.phone} is not null and ${users.googleId} is null`),
    count(users, sql`${users.googleId} is not null and ${users.phone} is null`),
    count(users, sql`${users.googleId} is not null and ${users.phone} is not null`),
    count(tanks, isNull(tanks.deletedAt)),
    count(livestock, sql`${livestock.status} = 'alive'`),
    count(scans),
    count(aiInteractions),
    count(logEntries, isNull(logEntries.deletedAt)),
    count(communityPosts, isNull(communityPosts.deletedAt)),
    count(communityComments, isNull(communityComments.deletedAt)),
    count(communityLikes),
    count(communityReports),
  ]);

  // Signups per day, last 14 days — the simplest possible "is this thing
  // growing" signal, per T-030's own "pick a first real set" guidance.
  const signupRows = await serverDb
    .select({ day: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`, n: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(sql`${users.createdAt} > now() - interval '14 days'`)
    .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`);

  // AI usage by kind + total cost — the first real use of the per-call
  // token/cost logging CLAUDE.md's AI rules require, now that
  // ai_interactions is server-side (2026-09-11's migration pass).
  const aiByKind = await serverDb
    .select({
      kind: aiInteractions.kind,
      n: sql<number>`count(*)`.mapWith(Number),
      costUsd: sql<number>`coalesce(sum(${aiInteractions.costUsd}), 0)`.mapWith(Number),
    })
    .from(aiInteractions)
    .groupBy(aiInteractions.kind);

  const ratingRows = await serverDb
    .select({ rating: aiInteractions.rating, n: sql<number>`count(*)`.mapWith(Number) })
    .from(aiInteractions)
    .groupBy(aiInteractions.rating);

  return NextResponse.json({
    accounts: { total: totalUsers, phoneOnly: phoneUsers, googleOnly: googleUsers, both: bothUsers },
    signupsPerDay: signupRows,
    tanks: totalTanks,
    aliveLivestock,
    scans: totalScans,
    journalEntries: totalJournalEntries,
    ai: { totalInteractions: totalAiInteractions, byKind: aiByKind, ratings: ratingRows },
    community: { posts: totalPosts, comments: totalComments, likes: totalLikes, pendingReports },
  });
}
