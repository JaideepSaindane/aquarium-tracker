import { eq } from "drizzle-orm";
import { db } from "../client";
import { settings } from "../schema";
import { notifyChanged } from "../live";

// Generic local key-value store — used for small flags like "has onboarding
// finished" that don't deserve their own table. Never anything that needs
// querying/joining; that belongs in a real table.
export async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  notifyChanged();
}

// T-003/species-catalog: lets DbBootProvider re-run seedSpecies() when
// data/species.seed.json changes meaningfully (e.g. the 30→445 species
// catalog expansion, or the species-photo pass that added `imageUri`),
// not just on a brand-new install. Bumping SPECIES_SEED_VERSION in
// src/db/DbBootProvider.tsx is what normally triggers a reseed — this is
// just the stored marker of which version a given browser last applied.
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
  return getSetting(SPECIES_SEED_VERSION_KEY);
}

export async function setSpeciesSeedVersion(version: string): Promise<void> {
  await setSetting(SPECIES_SEED_VERSION_KEY, version);
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

// T-026: when this device's copy of the app first ran. Stamped once from
// OnboardingGate on first boot, never touched again — the anchor for the
// activation and logging-retention metrics.
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
