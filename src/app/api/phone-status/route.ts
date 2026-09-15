import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { checkIpRateLimit } from "@/server/ai/ip-rate-limit";

// Lets the sign-in screen say "enter your password" vs "set a password" for
// a phone number. This does reveal whether a number is registered — accepted
// for clarity (Jaideep, 2026-09-15); IP rate-limited to slow bulk lookups.
export async function POST(req: NextRequest) {
  const rate = await checkIpRateLimit(req);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone ?? "").trim();
  if (!/^\d{10,15}$/.test(phone)) return NextResponse.json({ exists: false });
  const row = (await serverDb.select({ id: users.id }).from(users).where(eq(users.phone, phone)))[0];
  return NextResponse.json({ exists: !!row });
}
