import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminDashSession, ADMIN_DASH_COOKIE } from "@/server/auth/require-admin-dash";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/server/auth/login-rate-limit";

// Fixed to a single ID/password (Jaideep, 2026-09-15) — no per-user
// accounts, no signup, just one shared secret pair read from env so
// neither value sits in source control. Reuses the same 5-attempts/15-min
// lockout Redis pattern the app's own phone+PIN sign-in already uses
// (src/server/auth/login-rate-limit.ts), keyed by a fixed string since
// there's only ever one "account" here.
const LOCKOUT_KEY = "admin-dashboard";

export async function POST(req: Request) {
  const body = await req.json();
  const phone = String(body.phone ?? "").trim();
  const pin = String(body.pin ?? "").trim();

  if (await isLockedOut(LOCKOUT_KEY)) {
    return NextResponse.json({ error: "Too many failed attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const expectedPhone = process.env.ADMIN_DASH_PHONE;
  const expectedPinHash = process.env.ADMIN_DASH_PIN_HASH;
  if (!expectedPhone || !expectedPinHash) {
    return NextResponse.json({ error: "Admin dashboard login is not configured." }, { status: 500 });
  }

  const phoneMatches = phone === expectedPhone;
  const pinMatches = pin.length > 0 && (await bcrypt.compare(pin, expectedPinHash));

  if (!phoneMatches || !pinMatches) {
    await recordFailedAttempt(LOCKOUT_KEY);
    return NextResponse.json({ error: "Incorrect ID or password." }, { status: 401 });
  }

  await clearAttempts(LOCKOUT_KEY);
  const token = await createAdminDashSession();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_DASH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
