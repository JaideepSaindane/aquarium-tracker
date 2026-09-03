import { eq } from "drizzle-orm";
import { db } from "../client";
import { profile } from "../schema";
import { nowIso } from "../id";
import { notifyChanged } from "../live";

const LOCAL_PROFILE_ID = "local";

export async function getProfile() {
  const rows = await db.select().from(profile).where(eq(profile.id, LOCAL_PROFILE_ID));
  return rows[0];
}

export async function saveProfile(input: { name?: string; username?: string; city?: string; email?: string; contact?: string; photoUri?: string }) {
  const now = nowIso();
  const existing = await getProfile();
  if (existing) {
    await db
      .update(profile)
      .set({
        name: input.name,
        username: input.username,
        city: input.city,
        email: input.email,
        contact: input.contact,
        photoUri: input.photoUri,
        updatedAt: now,
      })
      .where(eq(profile.id, LOCAL_PROFILE_ID));
  } else {
    await db.insert(profile).values({
      id: LOCAL_PROFILE_ID,
      name: input.name,
      username: input.username,
      city: input.city,
      email: input.email,
      contact: input.contact,
      photoUri: input.photoUri,
      createdAt: now,
      updatedAt: now,
    });
  }
  notifyChanged();
}
