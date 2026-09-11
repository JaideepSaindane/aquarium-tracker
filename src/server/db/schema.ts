// Server-side Postgres schema (Neon), introduced 2026-09-10 for real user
// accounts — see specs/PROGRESS.md's 2026-09-10 "accounts + backend" entry
// and CLAUDE.md's updated Principle 5 for why this now exists alongside the
// local SQLite schema (src/db/schema.ts). First pass migrated `users` plus
// the four highest-traffic tables (tanks/livestock/measurements/profile).
// 2026-09-11: a second pass (plants/equipment/logEntries/photos, the
// most-used of the remaining 13 local tables — a deliberate few-at-a-time
// rollout, not all 13 at once) adds four more, same userId-scoped pattern.
// `photos.localUri` now holds a real https Vercel Blob URL for anything
// written through these new tables (see src/lib/photo-upload.ts) rather
// than an OPFS-relative path — the column name is kept for continuity with
// the local schema's own field, even though it's no longer "local". The
// remaining 9 tables (scans, aiInteractions, dexCards, dismissedWarnings,
// settings, speciesSuggestions, species catalog, parameterDefs) stay
// local-only until a further follow-up pass.
import { pgTable, text, real, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  // At least one of (email/googleId) or (phone/pinHash) is set, depending on
  // how the person first signed up — but not necessarily exactly one: a
  // Google account can later link a phone+PIN too (src/app/api/account/
  // link-phone/route.ts, added 2026-09-10 so the two sign-in paths don't
  // silently create two separate accounts for the same person).
  email: text("email"),
  googleId: text("google_id"),
  phone: text("phone"),
  pinHash: text("pin_hash"), // bcrypt hash of a self-chosen 4-digit PIN — never the PIN itself
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
  uniqueIndex("users_google_id_idx").on(table.googleId),
  uniqueIndex("users_phone_idx").on(table.phone),
]);

export const tanks = pgTable("tanks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  photoUri: text("photo_uri"),
  lengthCm: real("length_cm").notNull(),
  widthCm: real("width_cm").notNull(),
  heightCm: real("height_cm").notNull(),
  volumeL: real("volume_l").notNull(),
  shape: text("shape"),
  status: text("status"),
  waterType: text("water_type"),
  isPlanted: boolean("is_planted"),
  hasCo2: boolean("has_co2"),
  setupType: text("setup_type"),
  city: text("city"),
  startedOn: text("started_on"),
  substrate: text("substrate"),
  notes: text("notes"),
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const livestock = pgTable("livestock", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id").notNull(),
  speciesId: text("species_id").notNull(),
  nickname: text("nickname"),
  count: integer("count").notNull().default(1),
  addedOn: text("added_on").notNull(),
  removedOn: text("removed_on"),
  status: text("status"),
  deathCause: text("death_cause"),
  source: text("source"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const measurements = pgTable("measurements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id").notNull(),
  parameterId: text("parameter_id").notNull(),
  value: real("value").notNull(),
  measuredAt: text("measured_at").notNull(),
  method: text("method"),
  note: text("note"),
  photoUri: text("photo_uri"),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});

// Needed alongside `livestock` — addLivestock/recordDeath/markLivestockArrived
// all write a timeline event in the same transaction-ish sequence as the
// local version did, so this couldn't be left for a later pass without
// silently breaking the per-fish timeline feature.
export const livestockEvents = pgTable("livestock_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  livestockId: text("livestock_id").notNull(),
  type: text("type").notNull(),
  occurredAt: text("occurred_at").notNull(),
  note: text("note"),
  photoUri: text("photo_uri"),
  createdAt: text("created_at").notNull(),
});

export const plants = pgTable("plants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id").notNull(),
  speciesId: text("species_id"),
  commonName: text("common_name"),
  plantedOn: text("planted_on"),
  quantity: integer("quantity"),
  lightNeed: text("light_need"),
  co2Need: text("co2_need"),
  trimIntervalDays: integer("trim_interval_days"),
  lastTrimmedOn: text("last_trimmed_on"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const equipment = pgTable("equipment", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id").notNull(),
  type: text("type").notNull(),
  subtype: text("subtype"),
  brand: text("brand"),
  model: text("model"),
  wattage: real("wattage"),
  ratedLph: real("rated_lph"),
  installedOn: text("installed_on"),
  serviceIntervalDays: integer("service_interval_days"),
  lastServicedOn: text("last_serviced_on"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const logEntries = pgTable("log_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id").notNull(),
  type: text("type"),
  body: text("body"),
  occurredAt: text("occurred_at").notNull(),
  waterChangedPct: real("water_changed_pct"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const photos = pgTable("photos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id"),
  livestockId: text("livestock_id"),
  logEntryId: text("log_entry_id"),
  scanId: text("scan_id"),
  // A real https Vercel Blob URL now, not an OPFS-relative path — see the
  // note at the top of this file.
  localUri: text("local_uri").notNull(),
  caption: text("caption"),
  takenAt: text("taken_at"),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});

// Single row per user (replaces the old id="local" single-device row).
export const profile = pgTable("profile", {
  userId: text("user_id").primaryKey(),
  name: text("name"),
  username: text("username"),
  city: text("city"),
  email: text("email"),
  contact: text("contact"),
  photoUri: text("photo_uri"),
  // Set the moment this account finishes the onboarding screen (specs/T-023).
  // Replaces the old local-SQLite-only "onboarding_complete" flag, which was
  // scoped to a browser/device, not an account — a new account signing in on
  // a browser that had already onboarded a different account used to skip
  // onboarding incorrectly. Null means "never onboarded."
  onboardingCompletedAt: text("onboarding_completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
