import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroyAdminDashSession, ADMIN_DASH_COOKIE } from "@/server/auth/require-admin-dash";

export async function POST() {
  const store = await cookies();
  const token = store.get(ADMIN_DASH_COOKIE)?.value;
  if (token) await destroyAdminDashSession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_DASH_COOKIE);
  return res;
}
