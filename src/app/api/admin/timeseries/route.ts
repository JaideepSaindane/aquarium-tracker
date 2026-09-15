import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { requireAdminDashSession } from "@/server/auth/require-admin-dash";

// Time-bucketed metrics for the admin dashboard's graph view (Jaideep,
// 2026-09-15: "day, 3 day, week and month view, include all metrics").
// Buckets are aligned to IST (UTC+5:30, no DST) so "a day" means his day.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const RANGES = {
  day: { buckets: 24, stepMs: HOUR },
  "3d": { buckets: 12, stepMs: 6 * HOUR },
  week: { buckets: 7, stepMs: 24 * HOUR },
  month: { buckets: 30, stepMs: 24 * HOUR },
} as const;
type RangeKey = keyof typeof RANGES;

// Table and created-at expression per metric. Static strings only — never
// built from request input. `users.created_at` is a real timestamptz; every
// other table stores an ISO text column.
const METRICS: { key: string; label: string; table: string; ts: string; value?: "count" | "cost" | "distinct_user" }[] = [
  { key: "activeUsers", label: "Active users", table: "page_views", ts: "created_at::timestamptz", value: "distinct_user" },
  { key: "signups", label: "New signups", table: "users", ts: "created_at" },
  { key: "installs", label: "App installs", table: "app_installs", ts: "created_at::timestamptz" },
  { key: "pageViews", label: "Page views", table: "page_views", ts: "created_at::timestamptz" },
  { key: "aiCalls", label: "AI calls", table: "ai_interactions", ts: "created_at::timestamptz" },
  { key: "aiCost", label: "AI cost (USD)", table: "ai_interactions", ts: "created_at::timestamptz", value: "cost" },
  { key: "scans", label: "Tank scans", table: "scans", ts: "created_at::timestamptz" },
  { key: "tanks", label: "Tanks created", table: "tanks", ts: "created_at::timestamptz" },
  { key: "livestock", label: "Fish added", table: "livestock", ts: "created_at::timestamptz" },
  { key: "journal", label: "Journal entries", table: "log_entries", ts: "created_at::timestamptz" },
  { key: "posts", label: "Community posts", table: "community_posts", ts: "created_at::timestamptz" },
  { key: "comments", label: "Comments", table: "community_comments", ts: "created_at::timestamptz" },
  { key: "likes", label: "Likes", table: "community_likes", ts: "created_at::timestamptz" },
  { key: "feedback", label: "Feedback", table: "feedback", ts: "created_at::timestamptz" },
];

export async function GET(req: NextRequest) {
  if (!(await requireAdminDashSession())) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const param = req.nextUrl.searchParams.get("range") ?? "week";
  const rangeKey: RangeKey = param in RANGES ? (param as RangeKey) : "week";
  const { buckets, stepMs } = RANGES[rangeKey];

  // Align "now" down to the current bucket boundary in IST, then walk back.
  const now = Date.now();
  const localNow = now + IST_OFFSET_MS;
  const currentBucketStart = Math.floor(localNow / stepMs) * stepMs - IST_OFFSET_MS;
  const windowStart = currentBucketStart - (buckets - 1) * stepMs;
  const starts = Array.from({ length: buckets }, (_, i) => windowStart + i * stepMs);
  const since = new Date(windowStart).toISOString();

  const series = await Promise.all(
    METRICS.map(async (m) => {
      const valueExpr = m.value === "cost" ? "coalesce(sum(cost_usd), 0)" : m.value === "distinct_user" ? "count(distinct user_id)" : "count(*)";
      // Hourly aggregation in SQL (≤720 rows for a month), rebucketed below.
      // Active users can't be summed across hours, so those come back as raw
      // (hour, user) pairs and are de-duplicated per bucket.
      const query =
        m.value === "distinct_user"
          ? `select extract(epoch from date_trunc('hour', ${m.ts})) * 1000 as h, user_id as u from ${m.table} where ${m.ts} >= '${since}'::timestamptz group by 1, 2`
          : `select extract(epoch from date_trunc('hour', ${m.ts})) * 1000 as h, ${valueExpr} as v from ${m.table} where ${m.ts} >= '${since}'::timestamptz group by 1`;
      const result = await serverDb.execute(sql.raw(query));
      const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;

      const values = new Array<number>(buckets).fill(0);
      const userSets = m.value === "distinct_user" ? starts.map(() => new Set<string>()) : null;
      for (const row of rows) {
        const t = Number(row.h);
        const idx = Math.floor((t - windowStart) / stepMs);
        if (idx < 0 || idx >= buckets) continue;
        if (userSets) userSets[idx].add(String(row.u));
        else values[idx] += Number(row.v);
      }
      if (userSets) userSets.forEach((set, i) => (values[i] = set.size));

      let total: number;
      if (userSets) {
        const all = new Set<string>();
        userSets.forEach((set) => set.forEach((u) => all.add(u)));
        total = all.size;
      } else {
        total = values.reduce((a, b) => a + b, 0);
      }
      return { key: m.key, label: m.label, isCurrency: m.value === "cost", values, total };
    })
  );

  return NextResponse.json({ range: rangeKey, stepMs, bucketStarts: starts.map((s) => new Date(s).toISOString()), series });
}
