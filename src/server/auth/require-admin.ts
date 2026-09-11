import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireUserId } from "./require-user";

// No real admin-role concept exists yet (T-030's own spec flags this as a
// real gap) — this is the minimal version: an allowlist of emails, read
// from ADMIN_EMAILS (comma-separated) with Jaideep's own address as the
// default so the dashboard works out of the box without extra Vercel env
// setup. Phone-only accounts have no email and can never match this list,
// which is fine — the dashboard is for the product owner, not a general
// per-account permission.
const DEFAULT_ADMIN_EMAILS = ["jaideep.saindane@gmail.com"];

function adminEmails(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS;
  if (!fromEnv) return DEFAULT_ADMIN_EMAILS;
  return fromEnv.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/** Returns the signed-in user's id if their account's email is on the admin allowlist, otherwise null. */
export async function requireAdminUserId(): Promise<string | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  const row = (await serverDb.select().from(users).where(eq(users.id, userId)))[0];
  if (!row?.email) return null;
  return adminEmails().includes(row.email.toLowerCase()) ? userId : null;
}
