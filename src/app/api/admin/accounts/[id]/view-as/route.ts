import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireAdminDashSession } from "@/server/auth/require-admin-dash";
import { createViewAsToken, VIEW_AS_COOKIE } from "@/server/auth/view-as";

/** Starts a 30-minute read-only view of this account (admin dashboard only). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminDashSession())) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;

  const user = (await serverDb.select({ id: users.id }).from(users).where(eq(users.id, id)))[0];
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const token = await createViewAsToken(id, "admin-dashboard");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEW_AS_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 60 });
  return res;
}
