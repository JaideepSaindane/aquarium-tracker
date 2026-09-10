import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";

/**
 * Links a phone+PIN to an already-signed-in account (in practice, a Google
 * account adding phone sign-in as a second path in) — added 2026-09-10 per
 * Jaideep: without this, someone who signs up with Google once and phone+PIN
 * another time ends up with two separate, unlinked accounts and their data
 * looks "lost" under whichever one they didn't just use.
 *
 * Deliberately does NOT attempt to merge two already-existing separate
 * accounts that happen to share a phone number — phone numbers are never
 * verified (no SMS OTP, CLAUDE.md's documented tradeoff), so silently
 * merging on a bare number match risks combining two different people's
 * data. It blocks with a clear message instead (Jaideep's explicit choice).
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { phone: rawPhone, pin: rawPin } = await req.json();
  const phone = String(rawPhone ?? "").trim();
  const pin = String(rawPin ?? "").trim();
  if (!/^\d{10,15}$/.test(phone)) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });

  const conflict = (await serverDb.select().from(users).where(eq(users.phone, phone)))[0];
  if (conflict && conflict.id !== userId) {
    return NextResponse.json(
      { error: "This phone number already has an account. Sign in with that PIN instead, or use a different number." },
      { status: 409 },
    );
  }

  const pinHash = await bcrypt.hash(pin, 10);
  await serverDb.update(users).set({ phone, pinHash }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
