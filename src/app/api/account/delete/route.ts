import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { serverDb } from "@/server/db/client";
import { requireUserId } from "@/server/auth/require-user";
import {
  users,
  tanks,
  livestock,
  measurements,
  livestockEvents,
  plants,
  equipment,
  logEntries,
  photos,
  scans,
  aiInteractions,
  dexCards,
  dismissedWarnings,
  settingsTable,
  speciesSuggestions,
  parameterDefs,
  profile,
  communityPosts,
  communityComments,
  communityReports,
  communityLikes,
} from "@/server/db/schema";
import { nowIso } from "@/db/id";

/**
 * A real, self-serve "delete my account" — built 2026-09-12 alongside the
 * privacy policy rewrite, so the policy can honestly point at something
 * that exists instead of saying "email us" (Jaideep: "we'll build this
 * out" when asked). Deletes every row this account owns across every
 * server table (see src/server/db/schema.ts's full table list — there are
 * no foreign-key constraints in this schema, so table order doesn't
 * matter), best-effort deletes any Vercel Blob photos this account
 * uploaded, then deletes the account row itself. The species catalog is
 * shared reference data, not this account's data, and is untouched.
 *
 * Community posts/comments are soft-deleted (deletedAt), matching the
 * existing self-delete convention elsewhere in Community — a hard delete
 * would leave dangling replies/likes pointed at a vanished post id.
 * Community likes and reports this account filed are hard-deleted.
 *
 * This is irreversible — there is no "restore my account" path. The
 * client must get explicit confirmation before calling this.
 */
export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Best-effort: delete this account's uploaded photos from Blob storage
  // before the rows naming them are gone. A failed blob delete (already
  // gone, transient network error) should never block deleting the rest of
  // the account — an orphaned blob is a minor cleanup gap, not a reason to
  // leave someone's data behind.
  const ownedPhotos = await serverDb.select({ url: photos.localUri }).from(photos).where(eq(photos.userId, userId));
  await Promise.all(
    ownedPhotos
      .filter((p) => p.url?.startsWith("https://"))
      .map((p) => del(p.url).catch(() => {}))
  );

  const now = nowIso();

  await Promise.all([
    serverDb.delete(tanks).where(eq(tanks.userId, userId)),
    serverDb.delete(livestock).where(eq(livestock.userId, userId)),
    serverDb.delete(measurements).where(eq(measurements.userId, userId)),
    serverDb.delete(livestockEvents).where(eq(livestockEvents.userId, userId)),
    serverDb.delete(plants).where(eq(plants.userId, userId)),
    serverDb.delete(equipment).where(eq(equipment.userId, userId)),
    serverDb.delete(logEntries).where(eq(logEntries.userId, userId)),
    serverDb.delete(photos).where(eq(photos.userId, userId)),
    serverDb.delete(scans).where(eq(scans.userId, userId)),
    serverDb.delete(aiInteractions).where(eq(aiInteractions.userId, userId)),
    serverDb.delete(dexCards).where(eq(dexCards.userId, userId)),
    serverDb.delete(dismissedWarnings).where(eq(dismissedWarnings.userId, userId)),
    serverDb.delete(settingsTable).where(eq(settingsTable.userId, userId)),
    serverDb.delete(speciesSuggestions).where(eq(speciesSuggestions.userId, userId)),
    serverDb.delete(parameterDefs).where(eq(parameterDefs.userId, userId)),
    serverDb.delete(profile).where(eq(profile.userId, userId)),
    serverDb.update(communityPosts).set({ deletedAt: now }).where(eq(communityPosts.userId, userId)),
    serverDb.update(communityComments).set({ deletedAt: now }).where(eq(communityComments.userId, userId)),
    serverDb.delete(communityLikes).where(eq(communityLikes.userId, userId)),
    serverDb.delete(communityReports).where(eq(communityReports.reporterUserId, userId)),
  ]);

  await serverDb.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ ok: true });
}
