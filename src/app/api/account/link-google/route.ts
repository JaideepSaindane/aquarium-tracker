import { NextResponse } from "next/server";
import { requireUserId } from "@/server/auth/require-user";
import { setLinkIntent } from "@/server/auth/link-intent";

/**
 * Starts the "link my Google account" flow (2026-09-11) — the reverse of
 * the existing link-phone route: this one is for someone who signed up
 * with phone+PIN first and wants to add Google as a second way in.
 * Records who's asking (the link-intent cookie, consumed once by the
 * signIn callback in src/auth.ts), then hands off to NextAuth's own
 * Google sign-in route to run the real OAuth flow. Redirect instead of a
 * JSON response since the browser needs to actually navigate to Google.
 */
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await setLinkIntent(userId);

  const url = new URL(req.url);
  const callbackUrl = `${url.origin}/settings?linked=google`;
  return NextResponse.redirect(`${url.origin}/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
