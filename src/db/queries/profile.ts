import { notifyChanged } from "../live";

// Rewritten 2026-09-10 to call the new per-user server API
// (src/app/api/profile) now that real accounts exist — this used to be a
// single local row keyed "local" with no auth; now it's one row per
// signed-in user, resolved server-side from the session.

export type ProfileRow = {
  userId: string;
  name: string | null;
  username: string | null;
  city: string | null;
  email: string | null;
  contact: string | null;
  photoUri: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getProfile(): Promise<ProfileRow | null> {
  const res = await fetch("/api/profile");
  if (!res.ok) return null;
  return res.json();
}

export async function saveProfile(input: { name?: string; username?: string; city?: string; email?: string; contact?: string; photoUri?: string; onboardingCompletedAt?: string | null }): Promise<void> {
  await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  notifyChanged();
}
