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

// 2026-09-11, third migration pass: the rest of the previously-local
// tables, same userId-scoped pattern. `species`/the seed catalog is
// deliberately NOT migrated here — it's shared reference data (the same
// 1,484 species for every user), not per-user data, so it stays in local
// SQLite and is re-seeded from data/species.seed.json as before; moving it
// per-user would be the wrong data model, not just unfinished work.
// `parameterDefs`' global 8 standard-parameter defaults are dropped as a
// table entirely — they were a hardcoded constant seeded into rows for no
// real reason; only genuine per-tank overrides/custom parameters are real
// user data and need to follow an account, so only those are migrated.

export const scans = pgTable("scans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id").notNull(),
  imageUri: text("image_uri").notNull(),
  modelName: text("model_name").notNull(),
  modelVersion: text("model_version"),
  promptVersion: text("prompt_version").notNull(),
  rawResponse: text("raw_response").notNull(),
  findings: text("findings"),
  scores: text("scores"),
  userCorrections: text("user_corrections"),
  createdAt: text("created_at").notNull(),
});

export const aiInteractions = pgTable("ai_interactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id"),
  kind: text("kind"),
  promptVersion: text("prompt_version").notNull(),
  userInput: text("user_input"),
  groundingRefs: text("grounding_refs"),
  response: text("response"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: real("cost_usd"),
  latencyMs: integer("latency_ms"),
  rating: integer("rating"),
  correctionText: text("correction_text"),
  createdAt: text("created_at").notNull(),
});

export const dexCards = pgTable("dex_cards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  speciesId: text("species_id").notNull(),
  unlockedAt: text("unlocked_at"),
  unlockSource: text("unlock_source"),
  timesKept: integer("times_kept"),
  firstPhotoUri: text("first_photo_uri"),
  createdAt: text("created_at").notNull(),
});

export const dismissedWarnings = pgTable("dismissed_warnings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id"),
  livestockId: text("livestock_id"),
  warningKey: text("warning_key").notNull(),
  dismissedAt: text("dismissed_at").notNull(),
});

export const settingsTable = pgTable("user_settings", {
  userId: text("user_id").notNull(),
  key: text("key").notNull(),
  value: text("value"),
}, (table) => [
  uniqueIndex("user_settings_user_key_idx").on(table.userId, table.key),
]);

export const speciesSuggestions = pgTable("species_suggestions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  suggestedName: text("suggested_name").notNull(),
  note: text("note"),
  photoUri: text("photo_uri"),
  aiCandidates: text("ai_candidates"),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
});

// Only real per-tank overrides/custom parameters — global defaults are a
// client-side constant now (see the note above), not rows in this table.
export const parameterDefs = pgTable("parameter_defs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tankId: text("tank_id").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  targetMin: real("target_min"),
  targetMax: real("target_max"),
  decimals: integer("decimals"),
  sortOrder: integer("sort_order"),
  isActive: boolean("is_active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
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

// Community (2026-09-11, MVP pass) — a deliberate, confirmed exception to
// CLAUDE.md's "do not build yet" list, same as accounts were on 2026-09-10.
// Author name/photo are NOT denormalized here — every read joins against
// `profile` by userId at query time, so a later profile change is reflected
// everywhere immediately instead of going stale on old posts.
export const communityPosts = pgTable("community_posts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  // JSON array of Blob URLs, 0+ photos — replaced the original single
  // `photoUri` column (2026-09-11, Jaideep: "add more photos so we can put
  // multiple photos"). The feature was brand new with no real posts yet,
  // so this was a clean swap, not a migration path for old data.
  photoUris: text("photo_uris"),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const communityComments = pgTable("community_comments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  postId: text("post_id").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});

// No admin action queue yet (Jaideep's explicit MVP scope) — this exists so
// reports are visible at all, via the hidden /dev/community-reports viewer.
export const communityReports = pgTable("community_reports", {
  id: text("id").primaryKey(),
  reporterUserId: text("reporter_user_id").notNull(),
  targetType: text("target_type").notNull(), // "post" | "comment"
  targetId: text("target_id").notNull(),
  reason: text("reason"),
  createdAt: text("created_at").notNull(),
});

// Like button (2026-09-11, Jaideep's ask). One row per (user, post) —
// liking again is a no-op, unliking deletes the row; see
// /api/community/posts/[id]/like's toggle logic.
export const communityLikes = pgTable("community_likes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  postId: text("post_id").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("community_likes_user_post_idx").on(table.userId, table.postId),
]);
