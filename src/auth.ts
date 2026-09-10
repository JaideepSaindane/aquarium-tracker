import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { newId } from "@/db/id";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/server/auth/login-rate-limit";

/**
 * Real user accounts, added 2026-09-10 — see CLAUDE.md's updated Principle 5
 * and specs/PROGRESS.md's "accounts + backend" entry for why this exists
 * (a deliberate, confirmed reversal of the earlier no-accounts decision).
 *
 * Two sign-in paths:
 * - Google OAuth — standard, verified identity via `email`.
 * - Phone number + a self-chosen 4-digit PIN (Jaideep's explicit call —
 *   no SMS OTP, so the phone number itself is never verified as belonging
 *   to whoever typed it). The `authorize()` below auto-registers a phone
 *   number the first time it's seen and treats every later attempt as a
 *   login — there is no separate signup endpoint.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google,
    Credentials({
      credentials: {
        phone: {},
        pin: {},
      },
      async authorize(raw) {
        const phone = String(raw?.phone ?? "").trim();
        const pin = String(raw?.pin ?? "").trim();
        if (!/^\d{10,15}$/.test(phone) || !/^\d{4}$/.test(pin)) return null;

        if (await isLockedOut(phone)) {
          throw new Error("Too many attempts. Try again in 15 minutes.");
        }

        const existing = (await serverDb.select().from(users).where(eq(users.phone, phone)))[0];

        if (!existing) {
          // First time this phone number has signed in — register it with
          // this PIN. Client already asked the user to type the PIN twice
          // to catch typos before we ever get here.
          const pinHash = await bcrypt.hash(pin, 10);
          const id = newId();
          await serverDb.insert(users).values({ id, phone, pinHash, createdAt: new Date() });
          return { id, name: null, email: null };
        }

        const valid = existing.pinHash ? await bcrypt.compare(pin, existing.pinHash) : false;
        if (!valid) {
          await recordFailedAttempt(phone);
          throw new Error("Incorrect PIN.");
        }
        await clearAttempts(phone);
        return { id: existing.id, name: existing.name, email: existing.email };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Google path: find-or-create a users row keyed on googleId/email so
      // every provider ends up with the same shape of identity (a users.id
      // every other server table's userId column points at).
      if (account?.provider === "google" && user.email) {
        const existing = (await serverDb.select().from(users).where(eq(users.googleId, account.providerAccountId)))[0];
        if (!existing) {
          const id = newId();
          await serverDb.insert(users).values({
            id,
            email: user.email,
            googleId: account.providerAccountId,
            name: user.name ?? null,
            createdAt: new Date(),
          });
          user.id = id;
        } else {
          user.id = existing.id;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.userId as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
