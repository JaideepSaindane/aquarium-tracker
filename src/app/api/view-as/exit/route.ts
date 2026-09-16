import { NextResponse } from "next/server";
import { clearViewAs, VIEW_AS_COOKIE } from "@/server/auth/view-as";

/** Ends read-only view-as. Deliberately exempt from the write block in src/proxy.ts. */
export async function POST() {
  await clearViewAs();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(VIEW_AS_COOKIE);
  return res;
}
