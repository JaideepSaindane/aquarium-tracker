// Server-side Postgres schema (Neon), introduced 2026-09-10 for real user
// accounts — see specs/PROGRESS.md's 2026-09-10 "accounts + backend" entry
// and CLAUDE.md's updated Principle 5 for why this now exists alongside the
// local SQLite schema (src/db/schema.ts). Only the tables actually migrated
// this pass are declared here: `users` plus the four highest-traffic
// tables (tanks/livestock/measurements/profile). The remaining local tables
// stay local-only until a follow-up pass migrates them with the same
// userId-scoped pattern established here.
import { pgTable, text, real, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  // Exactly one of (email/googleId) or (phone/pinHash) is set, depending on
  // how the person signed up. Never both null.
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

// Single row per user (replaces the old id="local" single-device row).
export const profile = pgTable("profile", {
  userId: text("user_id").primaryKey(),
  name: text("name"),
  username: text("username"),
  city: text("city"),
  email: text("email"),
  contact: text("contact"),
  photoUri: text("photo_uri"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
