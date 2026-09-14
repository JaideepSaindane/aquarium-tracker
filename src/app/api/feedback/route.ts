import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { feedback } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { requireAdminUserId } from "@/server/auth/require-admin";
import { newId, nowIso } from "@/db/id";

const VALID_SOURCES = ["home", "ask", "settings"];

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const input = await req.json();
  const body = String(input.body ?? "").trim();
  const source = VALID_SOURCES.includes(input.source) ? input.source : "unknown";
  if (!body) return NextResponse.json({ error: "Feedback can't be empty." }, { status: 400 });
  if (body.length > 4000) return NextResponse.json({ error: "That's a bit long — please keep it under 4000 characters." }, { status: 400 });

  await serverDb.insert(feedback).values({
    id: newId(),
    userId,
    source,
    body,
    createdAt: nowIso(),
  });
  return NextResponse.json({ ok: true });
}

// Used only by the hidden /dev/feedback viewer — same admin-allowlist gate
// as /api/community/reports, since this is every user's feedback, not the
// caller's own.
export async function GET() {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const rows = await serverDb.select().from(feedback).orderBy(desc(feedback.createdAt));
  return NextResponse.json(rows);
}
