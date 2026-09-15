import { NextResponse } from "next/server";
import { serverDb } from "@/server/db/client";
import { pageViews } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";
import { capText } from "@/server/ai/text-limits";

// Minimal page-view logging for the admin dashboard's per-account activity
// view (2026-09-15, Jaideep: "what pages they visited"). No fingerprinting,
// no third-party analytics — just "this account viewed this path, at this
// time," same userId-scoped shape as every other table.
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const path = capText(String(body.path ?? "").trim(), 300);
  if (!path) return NextResponse.json({ error: "No path given." }, { status: 400 });
  await serverDb.insert(pageViews).values({ id: newId(), userId, path, createdAt: nowIso() });
  return NextResponse.json({ ok: true });
}
