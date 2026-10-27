import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { DEMO_PHONE } from "@/constants/app";

// The demo account is shared by everyone holding its PIN, and its photos
// point at the very same Blob files as Jaideep's real account (the copy
// script doesn't duplicate files). So a demo session must never be able to
// delete the account (that would delete those shared files) or change how
// it signs in (that would lock every other judge out).
export function isDemoPhone(phone: string): boolean {
  return phone === DEMO_PHONE;
}

/** True when this user id is the shared demo account. */
export async function isDemoUser(userId: string): Promise<boolean> {
  const row = (await serverDb.select({ phone: users.phone }).from(users).where(eq(users.id, userId)))[0];
  return row?.phone === DEMO_PHONE;
}
