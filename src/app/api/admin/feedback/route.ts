import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { feedback, users } from "@/server/db/schema";
import { requireAdminDashSession } from "@/server/auth/require-admin-dash";

// Every feedback submission, newest first, with who sent it — for the
// admin dashboard's Feedback tab.
export async function GET() {
  if (!(await requireAdminDashSession())) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const rows = await serverDb
    .select({
      id: feedback.id,
      userId: feedback.userId,
      source: feedback.source,
      body: feedback.body,
      createdAt: feedback.createdAt,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(feedback)
    .leftJoin(users, eq(users.id, feedback.userId))
    .orderBy(desc(feedback.createdAt));
  return NextResponse.json({ feedback: rows });
}
