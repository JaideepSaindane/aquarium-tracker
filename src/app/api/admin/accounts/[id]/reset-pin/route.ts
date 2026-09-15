import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireAdminDashSession } from "@/server/auth/require-admin-dash";
import { clearAttempts } from "@/server/auth/login-rate-limit";

// Admin-only forgot-PIN reset (Jaideep, 2026-09-15): phone numbers are
// never verified, so a self-serve reset would let anyone take over any
// account. Users contact the team instead; the admin verifies them and sets
// a new 4-digit PIN here, which also clears any login lockout.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminDashSession())) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const pin = String(body.pin ?? "").trim();
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });

  const user = (await serverDb.select().from(users).where(eq(users.id, id)))[0];
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!user.phone) return NextResponse.json({ error: "This account has no phone number." }, { status: 400 });

  await serverDb.update(users).set({ pinHash: await bcrypt.hash(pin, 10) }).where(eq(users.id, id));
  await clearAttempts(user.phone);
  return NextResponse.json({ ok: true });
}
