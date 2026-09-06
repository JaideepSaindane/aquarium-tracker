// Mirrors docs/02-data-model.md exactly. Every table there has a row here —
// do not simplify tanks to volume-only, do not collapse livestock into a
// species join table, do not drop tables. See that doc for the "← why"
// reasoning behind the shape of `tanks`, `livestock`, `species`, `push_*`.
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// Conventions (docs/02-data-model.md §Conventions):
// - text UUID primary keys, generated client-side (src/db/id.ts)
// - timestamps are ISO 8601 UTC strings
// - all measurements stored metric
// - soft-delete via deleted_at
// - every table carries created_at/updated_at (except append-only logs, noted per table)

export const tanks = sqliteTable("tanks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  photoUri: text("photo_uri"),
  lengthCm: real("length_cm").notNull(),
  widthCm: real("width_cm").notNull(),
  heightCm: real("height_cm").notNull(),
  volumeL: real("volume_l").notNull(),
  shape: text("shape"), // rectangular | bowfront | cube | cylinder | bowl | other
  status: text("status"), // planned | active | archived
  waterType: text("water_type"), // fresh | brackish
  isPlanted: integer("is_planted", { mode: "boolean" }),
  hasCo2: integer("has_co2", { mode: "boolean" }),
  // bare_bottom | planted | aquascape | jungle | biotope | other — set by
  // Tank Scan's `setup.type` (T-015); left null for hand-created tanks.
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

export const livestock = sqliteTable("livestock", {
  id: text("id").primaryKey(),
  tankId: text("tank_id").notNull(),
  speciesId: text("species_id").notNull(),
  nickname: text("nickname"),
  count: integer("count").notNull().default(1),
  addedOn: text("added_on").notNull(),
  removedOn: text("removed_on"),
  // alive | rehomed | died | unknown | planned — 'planned' is a fish the
  // user WANTS (T-027 guided planner), not one living in the tank yet.
  // Every "actually in the tank" count must filter on status = 'alive',
  // never just "not died".
  status: text("status"),
  deathCause: text("death_cause"),
  source: text("source"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const livestockEvents = sqliteTable("livestock_events", {
  id: text("id").primaryKey(),
  livestockId: text("livestock_id").notNull(),
  // added | died | rehomed | spawned | treated | observed | photo | planned
  type: text("type").notNull(),
  occurredAt: text("occurred_at").notNull(),
  note: text("note"),
  photoUri: text("photo_uri"),
  createdAt: text("created_at").notNull(),
});

export const species = sqliteTable("species", {
  id: text("id").primaryKey(), // common-name kebab-case slug — stable forever
  scientificName: text("scientific_name").notNull(),
  commonNames: text("common_names"), // JSON array
  commonNamesIn: text("common_names_in"), // JSON array
  category: text("category"), // fish | shrimp | snail | crayfish | plant
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  sourceRefs: text("source_refs"), // JSON array
  tempCMin: real("temp_c_min"),
  tempCMax: real("temp_c_max"),
  phMin: real("ph_min"),
  phMax: real("ph_max"),
  hardnessDghMin: real("hardness_dgh_min"),
  hardnessDghMax: real("hardness_dgh_max"),
  adultSizeCm: real("adult_size_cm"),
  minVolumeL: real("min_volume_l"),
  minFootprintLengthCm: real("min_footprint_length_cm"),
  minFootprintWidthCm: real("min_footprint_width_cm"),
  socialMinGroup: integer("social_min_group"),
  temperament: text("temperament"),
  swimLevel: text("swim_level"),
  diet: text("diet"),
  difficulty: text("difficulty"),
  lifespanMinYears: real("lifespan_min_years"),
  lifespanMaxYears: real("lifespan_max_years"),
  breeding: text("breeding"),
  careNotes: text("care_notes"),
  commonMistakes: text("common_mistakes"), // JSON array
  incompatibleWith: text("incompatible_with"), // JSON array
  disputed: text("disputed"),
  origin: text("origin").notNull(), // seed | user | ai_generated
  uncertaintyNote: text("uncertainty_note"),
  aiConfidence: text("ai_confidence"), // high | medium | low
  flags: text("flags"), // JSON array
  dexRarity: text("dex_rarity"),
  dexTier: integer("dex_tier"),
  // A reference photo for the Dex card — a bundled static asset under
  // public/species/ (e.g. "/species/betta.jpg"), not an OPFS path. This is
  // shipped catalog art, not user data, so it belongs with the rest of the
  // app bundle rather than the per-device photo store.
  imageUri: text("image_uri"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const plants = sqliteTable("plants", {
  id: text("id").primaryKey(),
  tankId: text("tank_id").notNull(),
  speciesId: text("species_id"),
  commonName: text("common_name"),
  plantedOn: text("planted_on"),
  quantity: integer("quantity"),
  lightNeed: text("light_need"), // low | medium | high
  co2Need: text("co2_need"), // none | beneficial | required
  trimIntervalDays: integer("trim_interval_days"),
  lastTrimmedOn: text("last_trimmed_on"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const equipment = sqliteTable("equipment", {
  id: text("id").primaryKey(),
  tankId: text("tank_id").notNull(),
  type: text("type").notNull(), // filter | heater | light | co2 | air_pump | chiller | other
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

export const parameterDefs = sqliteTable("parameter_defs", {
  id: text("id").primaryKey(),
  tankId: text("tank_id"), // null = global default
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  targetMin: real("target_min"),
  targetMax: real("target_max"),
  decimals: integer("decimals"),
  sortOrder: integer("sort_order"),
  isActive: integer("is_active", { mode: "boolean" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const measurements = sqliteTable("measurements", {
  id: text("id").primaryKey(),
  tankId: text("tank_id").notNull(),
  parameterId: text("parameter_id").notNull(),
  value: real("value").notNull(),
  measuredAt: text("measured_at").notNull(),
  method: text("method"), // liquid_kit | strip | probe | lab | estimate
  note: text("note"),
  photoUri: text("photo_uri"),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  tankId: text("tank_id").notNull(),
  livestockId: text("livestock_id"),
  title: text("title").notNull(),
  presetType: text("preset_type"), // water_change | filter_clean | dose | co2_refill | trim | test | custom
  rrule: text("rrule"),
  nextDueAt: text("next_due_at"),
  lastDoneAt: text("last_done_at"),
  isActive: integer("is_active", { mode: "boolean" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

// Web Push (T-018) — renamed from scheduled_notifications on 2026-08-31 for the web pivot.
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  deviceLabel: text("device_label"),
  subscriptionJson: text("subscription_json").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at"),
});

export const pushSends = sqliteTable("push_sends", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  subscriptionId: text("subscription_id").notNull(),
  sentAt: text("sent_at").notNull(),
  status: text("status").notNull(), // sent | failed | pruned
});

export const logEntries = sqliteTable("log_entries", {
  id: text("id").primaryKey(),
  tankId: text("tank_id").notNull(),
  type: text("type"), // journal | maintenance | incident | treatment | water_change
  body: text("body"),
  occurredAt: text("occurred_at").notNull(),
  waterChangedPct: real("water_changed_pct"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  tankId: text("tank_id"),
  livestockId: text("livestock_id"),
  logEntryId: text("log_entry_id"),
  scanId: text("scan_id"),
  localUri: text("local_uri").notNull(),
  caption: text("caption"),
  takenAt: text("taken_at"),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const scans = sqliteTable("scans", {
  id: text("id").primaryKey(),
  tankId: text("tank_id").notNull(),
  imageUri: text("image_uri").notNull(),
  modelName: text("model_name").notNull(),
  modelVersion: text("model_version"),
  promptVersion: text("prompt_version").notNull(),
  rawResponse: text("raw_response").notNull(), // kept forever — the evaluation set
  findings: text("findings"), // JSON array, normalised
  scores: text("scores"), // JSON: {health, algae_burden, planting}
  userCorrections: text("user_corrections"), // JSON
  createdAt: text("created_at").notNull(),
});

export const aiInteractions = sqliteTable("ai_interactions", {
  id: text("id").primaryKey(),
  tankId: text("tank_id"),
  kind: text("kind"), // ask | triage | scan | compatibility | species_id | species_gen
  promptVersion: text("prompt_version").notNull(),
  userInput: text("user_input"),
  groundingRefs: text("grounding_refs"), // JSON array
  response: text("response"), // JSON
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: real("cost_usd"),
  latencyMs: integer("latency_ms"),
  rating: integer("rating"), // -1 | 0 | 1
  correctionText: text("correction_text"),
  createdAt: text("created_at").notNull(),
});

export const dexCards = sqliteTable("dex_cards", {
  id: text("id").primaryKey(),
  speciesId: text("species_id").notNull(),
  unlockedAt: text("unlocked_at"),
  unlockSource: text("unlock_source"), // added_to_tank | scan_detected | community
  timesKept: integer("times_kept"),
  firstPhotoUri: text("first_photo_uri"),
  createdAt: text("created_at").notNull(),
});

export const dismissedWarnings = sqliteTable("dismissed_warnings", {
  id: text("id").primaryKey(),
  tankId: text("tank_id"),
  livestockId: text("livestock_id"),
  warningKey: text("warning_key").notNull(), // deterministic, e.g. "compat:angelfish:neon-tetra:predation"
  dismissedAt: text("dismissed_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

// Single local row, id always "local". Replaces a real account system —
// no auth, no server, never leaves the device. Used only to pre-fill a
// default city on new tanks; never overrides a tank's own `city`. See
// specs/T-023-onboarding.md's profile addendum and specs/PROGRESS.md
// (2026-09-01 decision) for why this exists instead of Google sign-in.
export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(),
  name: text("name"),
  username: text("username"),
  city: text("city"),
  email: text("email"),
  contact: text("contact"),
  photoUri: text("photo_uri"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// A user's "add this to the catalog" suggestion from a Dex photo-scan that
// didn't match anything in our catalog (species-id's per-candidate
// `species_id: null`, see docs/03-ai-contracts.md Contract 6). Reviewed by
// hand on the hidden /dev/species-suggestions screen — see that page's own
// header comment for why this stays local-only rather than syncing to a
// server, same tradeoff as push reminders' narrow mirror.
export const speciesSuggestions = sqliteTable("species_suggestions", {
  id: text("id").primaryKey(),
  suggestedName: text("suggested_name").notNull(),
  note: text("note"),
  photoUri: text("photo_uri"),
  aiCandidates: text("ai_candidates"), // JSON array of {species_id, common_name, confidence, why} — context for the reviewer, not authoritative
  status: text("status").notNull(), // pending | approved | rejected
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
});
