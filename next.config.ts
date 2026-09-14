import type { NextConfig } from "next";

// Basic security headers (2026-09-15 security review) — none were set
// before, at any layer (checked src/proxy.ts too). No CSP here: a real
// Content-Security-Policy needs to enumerate every script/style/image
// source this app actually uses (Google fonts if any, Vercel Blob image
// URLs, the AI provider's own domain is server-side only so not relevant
// client-side) and getting that wrong breaks the app silently — worth a
// dedicated pass, not bundled into this fix. These four are safe,
// unconditional wins with no risk of breaking existing functionality.
const securityHeaders = [
  // Clickjacking: refuses to let this app be framed by another site.
  { key: "X-Frame-Options", value: "DENY" },
  // Stops the browser from guessing/re-interpreting a response's content
  // type away from what the server declared (e.g. treating an uploaded
  // photo as executable script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Forces HTTPS for a year, including subdomains, once a browser has
  // seen this once — the app is HTTPS-only on Vercel already, this just
  // makes that non-negotiable to the browser too.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Belt-and-suspenders alongside X-Frame-Options for browsers that
  // prefer the newer CSP-based framing control.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
