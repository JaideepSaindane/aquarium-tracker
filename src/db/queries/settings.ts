import { eq } from "drizzle-orm";
import { db } from "../client";
import { settings } from "../schema";
import { notifyChanged } from "../live";

// Split 2026-09-11 into two stores that look almost identical but mean
// different things:
//   - getLocalSetting/setLocalSetting: genuinely per-device local SQLite
//     state — used only for the species-catalog reseed marker below, which
//     tracks whether THIS device's local database has run the reseed, not
//     anything about the signed-in account. Moving this to the server would
//     be a real bug: a second device signing into the same account would
//     read "already reseeded" from the server and skip seeding its own,
//     never-yet-populated local species table.
//   - getSetting/setSetting: everything else (the tour flag, install
//     timestamp, survival-prompt state) is a genuine account preference
//     that should follow the user across devices, so those now call the
//     server API (src/app/api/user-settings/*).

async function getLocalSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return rows[0]?.value ?? null;
}

async function setLocalSetting(key: string, value: string): Promise<void> {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  notifyChanged();
}

export async function getSetting(key: string): Promise<string | null> {
  const res = await fetch(`/api/user-settings?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const { value } = (await res.json()) as { value: string | null };
  return value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await fetch("/api/user-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
  notifyChanged();
}

// T-003/species-catalog: lets DbBootProvider re-run seedSpecies() when
// data/species.seed.json changes meaningfully (e.g. the 30→445 species
// catalog expansion, or the species-photo pass that added `imageUri`),
// not just on a brand-new install. Bumping SPECIES_SEED_VERSION in
// src/db/DbBootProvider.tsx is what normally triggers a reseed — this is
// just the stored marker of which version a given browser last applied.
// Deliberately local (getLocalSetting), not the account-scoped store — see
// the note at the top of this file.
//
// Key renamed 2026-09-10 ("species_seed_version" → "..._v2") for the
// 445→1,484 corpus rebuild: every existing install stored its version
// under the old key, so it now reads as never-seeded and reseeds exactly
// once, then stores under this key and goes quiet again. This achieves
// the same one-shot invalidation as bumping the constant, without
// touching DbBootProvider.tsx (mid-edit by a parallel session at the
// time). Bumping the constant there remains the normal mechanism for
// future seed changes.
const SPECIES_SEED_VERSION_KEY = "species_seed_version_v2";

export async function getSpeciesSeedVersion(): Promise<string | null> {
  return getLocalSetting(SPECIES_SEED_VERSION_KEY);
}

export async function setSpeciesSeedVersion(version: string): Promise<void> {
  await setLocalSetting(SPECIES_SEED_VERSION_KEY, version);
}

// Onboarding-complete is no longer tracked here — it moved to the signed-in
// account's server-side profile (`onboardingCompletedAt`, src/server/db/schema.ts)
// on 2026-09-10, since a local/device flag doesn't know which account is
// signed in. See OnboardingGate.tsx and src/app/(tabs)/settings/page.tsx's
// "Start over" handler.

const TOUR_KEY = "first_tank_tour_shown";

export async function hasSeenFirstTankTour(): Promise<boolean> {
  return (await getSetting(TOUR_KEY)) === "true";
}

export async function markFirstTankTourShown(): Promise<void> {
  await setSetting(TOUR_KEY, "true");
}

// T-026: when this account first used the app. Stamped once from
// OnboardingGate on first boot, never touched again — the anchor for the
// activation and logging-retention metrics. Account-scoped (not per
// device) since 2026-09-11 — the metric is about the person's journey, not
// which browser they happened to open first.
const INSTALLED_AT_KEY = "installed_at";

export async function getInstalledAt(): Promise<string | null> {
  return getSetting(INSTALLED_AT_KEY);
}

export async function stampInstalledAtIfMissing(): Promise<void> {
  const existing = await getSetting(INSTALLED_AT_KEY);
  if (!existing) await setSetting(INSTALLED_AT_KEY, new Date().toISOString());
}

// T-026 survival prompt state. "Once every few weeks" is enforced by
// SURVIVAL_PROMPT_LAST_SHOWN_KEY (a single global cooldown, so the prompt
// never appears more than roughly every couple of weeks regardless of how
// many fish are eligible); SURVIVAL_PROMPT_ASKED_KEY tracks, per livestock
// row, when it was last asked about, so an "I'm not sure" answer doesn't
// get re-asked every single time the cooldown clears.
const SURVIVAL_PROMPT_DISABLED_KEY = "survival_prompt_disabled";
const SURVIVAL_PROMPT_LAST_SHOWN_KEY = "survival_prompt_last_shown_at";
const SURVIVAL_PROMPT_ASKED_KEY = "survival_prompt_asked_map";

export async function isSurvivalPromptDisabled(): Promise<boolean> {
  return (await getSetting(SURVIVAL_PROMPT_DISABLED_KEY)) === "true";
}

/** Permanent, per acceptance criterion 4 — there is deliberately no re-enable path. */
export async function disableSurvivalPromptForever(): Promise<void> {
  await setSetting(SURVIVAL_PROMPT_DISABLED_KEY, "true");
}

export async function getSurvivalPromptLastShownAt(): Promise<string | null> {
  return getSetting(SURVIVAL_PROMPT_LAST_SHOWN_KEY);
}

export async function markSurvivalPromptShownNow(): Promise<void> {
  await setSetting(SURVIVAL_PROMPT_LAST_SHOWN_KEY, new Date().toISOString());
}

export async function getSurvivalAskedMap(): Promise<Record<string, string>> {
  const raw = await getSetting(SURVIVAL_PROMPT_ASKED_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function markSurvivalAsked(livestockId: string): Promise<void> {
  const map = await getSurvivalAskedMap();
  map[livestockId] = new Date().toISOString();
  await setSetting(SURVIVAL_PROMPT_ASKED_KEY, JSON.stringify(map));
}
