import crypto from "node:crypto";
import { cookies } from "next/headers";

// Short-lived, tamper-proof marker for "link my Google account to me" —
// 2026-09-11, Jaideep: someone who signs up with phone+PIN first should be
// able to add Google sign-in the same way a Google-first user can already
// add phone sign-in (src/app/api/account/link-phone/route.ts). Google's
// OAuth flow is a full redirect away and back, so there's no other way to
// carry "which account asked for this" across it — a plain cookie would be
// forgeable, so this one is HMAC-signed with AUTH_SECRET (the same secret
// NextAuth itself signs session tokens with) and expires in 5 minutes.
const COOKIE_NAME = "aquaai_link_intent";
const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function setLinkIntent(userId: string): Promise<void> {
  const payload = JSON.stringify({ userId, exp: Date.now() + TTL_MS });
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  const value = `${encoded}.${sign(encoded)}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, { httpOnly: true, secure: true, sameSite: "lax", maxAge: TTL_MS / 1000, path: "/" });
}

/** Reads and immediately clears the link-intent cookie — single-use, so a replayed/reused cookie can't link a second time. Returns null if absent, expired, or tampered with. */
export async function consumeLinkIntent(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  jar.delete(COOKIE_NAME);
  if (!raw) return null;

  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const validSignature =
    expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!validSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload.userId;
  } catch {
    return null;
  }
}
