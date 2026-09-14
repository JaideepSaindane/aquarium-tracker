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

export default auth((req) => {
  const { pathname } = req.nextUrl;
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
