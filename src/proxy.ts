import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Accounts are required — Jaideep's explicit call, 2026-09-10 (supersedes
// CLAUDE.md's old Principle 5 "works at the tank, offline"; see the dated
// note there). Every route redirects to /login when signed out, except the
// auth machinery itself and a couple of static/public files.
// "/animations" is here specifically so the sign-in page's fish-leap intro
// (added 2026-09-13, plays before a signed-out visitor even sees the
// sign-in pills) can fetch fish-loader.json — without it, the same
// redirect-instead-of-404 bug the login-bg.jpg fix caught would silently
// swap the Lottie JSON for the /login page's own HTML.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/phone-status",
  "/manifest.json",
  "/icon.svg",
  "/icon-alternate.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-alternate-192.png",
  "/icon-alternate-512.png",
  "/sw.js",
  "/login-bg.jpg",
  "/animations",
];

// The admin dashboard has its own separate ID/password (Jaideep,
// 2026-09-15), independent of the regular AquaAI account system above —
// so /admin* and /api/admin* are checked here first, against their own
// cookie (src/server/auth/require-admin-dash.ts), and never fall through
// to the regular sign-in redirect at all. The actual cookie *validity*
// (a Redis lookup) happens in each API route itself; middleware here only
// confirms a cookie is present, since an unauthenticated visitor with no
// cookie is the common case and doesn't need a Redis round-trip to reject.
const ADMIN_DASH_PATHS = ["/admin", "/api/admin"];
const ADMIN_DASH_PUBLIC_PATHS = ["/admin/login", "/api/admin/login"];
const ADMIN_DASH_COOKIE = "admin_dash_session";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (ADMIN_DASH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (ADMIN_DASH_PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();
    if (req.cookies.get(ADMIN_DASH_COOKIE)?.value) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
  }

  // Already signed in and landing on /login (e.g. the back button stepping
  // back onto the sign-in page in history) — send home instead of showing a
  // sign-in form that looks like you were logged out.
  if (pathname === "/login" && req.auth) return NextResponse.redirect(new URL("/", req.nextUrl.origin));

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic || req.auth) return NextResponse.next();

  const loginUrl = new URL("/login", req.nextUrl.origin);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  // Skip Next's own internals/static assets; everything else goes through
  // the check above.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
