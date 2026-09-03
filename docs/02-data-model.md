# 02 — Data model

SQLite via Drizzle. Every table lives on the phone; there is no server database in Phase 1.

Four decisions here are direct responses to specific competitor failures. They are marked **← why** and should not be quietly simplified away.

---

## Conventions

- Primary keys are text UUIDs generated on device, not autoincrementing integers. This makes future sync possible without renumbering.
- Timestamps are ISO 8601 UTC strings (`2026-08-30T14:22:00Z`). Converted to local time only at the display layer.
- **All measurements are stored metric** — litres, centimetres, °C. Gallons and Fahrenheit are a display preference, never a storage format. Mixing units in storage is how the incumbents ended up with contradictory data.
- Soft-delete anything a user might want back: `deleted_at` rather than an actual delete. Principle 04.
- Every table carries `created_at` and `updated_at`.

---

## Tables

### `tanks`

```ts
id                text primary key
name              text not null
photo_uri         text
length_cm         real not null      // ← why: footprint, not just volume
width_cm          real not null
height_cm         real not null
volume_l          real not null      // derived from dimensions, user-overridable
shape             text               // rectangular | bowfront | cube | cylinder | bowl | other
status            text               // planned | active | archived  ← why: the "thinking about it" onboarding path saves a planned tank
water_type        text               // fresh | brackish
is_planted        integer            // boolean
has_co2           integer
city              text               // ← why: ambient temperature, hardness, monsoon warnings
started_on        text
substrate         text
notes             text
archived_at       text
created_at, updated_at, deleted_at
```

**← why (dimensions):** Aquareka stored volume only, which is why it wrongly declared kuhli loaches and corydoras incompatible. Bottom-dwellers need floor area; active swimmers need length. A 190L cube and a 190L long tank are different homes. A reviewer put it exactly: *"this doesn't include length, width and height info which is needed for choosing a fish."*

**← why (city):** ambient temperature gives heater wattage, local supply water gives hardness expectations, and season gives warnings — a Bangalore April heatwave is a real risk that no global app models. Non-obvious, cheap, and impossible for a US competitor to copy well.

### `livestock`

An **instance**, not a reference to a species. This is the difference between "this tank contains guppies" and "these six guppies, named, added on this date, four still alive."

```ts
id                text primary key
tank_id           text not null → tanks.id
species_id        text not null → species.id
nickname          text
count             integer not null default 1
added_on          text not null
removed_on        text
status            text               // alive | rehomed | died | unknown
death_cause       text               // ← why: the 90-day survival metric
source            text               // shop name, breeder, gift
notes             text
created_at, updated_at, deleted_at
```

**← why:** Aquarium Log users repeatedly asked for a per-fish timeline and never got it. One asked for *"a timeline for each livestock added to the tank."* Another complained it was *"a bit of a pain to add multiple of the same species."* Both are solved by modelling instances with counts and dates rather than a join table of species.

`death_cause` feeds the metric that matters most: fish survival at 90 days. It is the outcome the product actually sells, and no competitor can claim it. Ask gently and never make it feel like a scorecard — Principle 06.

### `livestock_events`

The per-fish timeline.

```ts
id, livestock_id → livestock.id
type              text               // added | died | rehomed | spawned | treated | observed | photo
occurred_at       text not null
note              text
photo_uri         text
created_at
```

### `species`

**Ids are common-name kebab-case slugs** — `neon-tetra`, `amano-shrimp`, `rosy-barb` — **not** scientific-name slugs. They are stable forever; they appear inside stored AI responses as `species:<id>` and must never be renumbered or reused.

```ts
id                text primary key   // common-name kebab-case slug
scientific_name   text not null
common_names      text               // JSON array
common_names_in   text               // JSON array — names used in Indian shops
category          text               // fish | shrimp | snail | crayfish | plant
verified          integer not null default 0   // ← why
source_refs       text               // JSON array of URLs
temp_c_min, temp_c_max               real
ph_min, ph_max                       real
hardness_dgh_min, hardness_dgh_max   real
adult_size_cm     real
min_volume_l      real
min_footprint_length_cm              real
min_footprint_width_cm               real
social_min_group  integer
temperament       text
swim_level        text
diet              text
difficulty        text
lifespan_min_years, lifespan_max_years  real
breeding          text
care_notes        text
common_mistakes   text               // JSON array
incompatible_with text               // JSON array of species ids or trait keywords
disputed          text               // ← why
origin            text not null      // seed | user | ai_generated
uncertainty_note  text               // from species-gen/v1, shown on unverified cards
ai_confidence     text               // high | medium | low, for ai_generated rows
flags             text               // JSON array from species-gen/v1
dex_rarity        text
dex_tier          integer
created_at, updated_at
```

**Seed file shape vs table shape.** `data/species.seed.json` uses nested objects; this table is flat. T-011 owns the mapping and must set `origin: 'seed'` on load:

| Seed JSON | Column(s) |
|---|---|
| `temp_c: {min,max}` | `temp_c_min`, `temp_c_max` |
| `ph: {min,max}` | `ph_min`, `ph_max` |
| `hardness_dgh: {min,max}` | `hardness_dgh_min`, `hardness_dgh_max` |
| `min_footprint_cm: {length,width}` | `min_footprint_length_cm`, `min_footprint_width_cm` |
| `lifespan_years: {min,max}` | `lifespan_min_years`, `lifespan_max_years` |
| `dex: {rarity,tier}` | `dex_rarity`, `dex_tier` |
| arrays (`common_names`, `source_refs`, `common_mistakes`, `incompatible_with`) | stored as JSON text |
| *(absent in seed)* | `origin` = `'seed'` |

**← why (`verified` + `origin`):** Principle 03. When a species is missing, the app generates a provisional card immediately, marks it `verified: 0`, `origin: 'ai_generated'`, and lets the user save and use it right away. It is queued for human review, not blocked. Missing species is the single most repeated complaint across both competitors — *"Doesn't even have the fish I already have. Waste of time!"* — and this makes it structurally impossible.

**← why (`disputed`):** the hobby genuinely disagrees on care parameters. Seriously Fish and Aquarium Co-Op differ by nearly 2× on angelfish minimum volume (110 L vs 200 L), and sources span 284 L to 1,900 L on common plecos. Storing a single number and presenting it as fact is what earned Aquareka reviews like *"Goldfish need 70L not 57L."* Store the honest range and surface the disagreement.

### `plants`

```ts
id, tank_id → tanks.id
species_id        text → species.id
common_name       text
planted_on        text
quantity          integer
light_need        text               // low | medium | high
co2_need          text               // none | beneficial | required
trim_interval_days integer
last_trimmed_on   text
notes             text
created_at, updated_at, deleted_at
```

Plants get their own table at parity with livestock. Aquarium Log users asked for this repeatedly — *"why not let us add plants just the same as the livestock menu?"* — and never got it.

### `equipment`

```ts
id, tank_id → tanks.id
type              text               // filter | heater | light | co2 | air_pump | chiller | other
subtype           text               // hang_on_back | sponge | canister | internal | ... — set by Tank Scan
brand, model      text
wattage           real
rated_lph         real               // filter flow
installed_on      text
service_interval_days integer
last_serviced_on  text
notes             text
created_at, updated_at, deleted_at
```

Filter flow and heater wattage against tank volume are two of the highest-value automatic checks the app can run, and both come free once this table exists.

### `parameter_defs`

```ts
id                text primary key
tank_id           text → tanks.id    // null = global default
name              text not null      // Ammonia, Nitrite, Nitrate, pH, GH, KH, Temperature, TDS...
unit              text not null
target_min, target_max  real         // ← why
decimals          integer
sort_order        integer
is_active         integer
created_at, updated_at
```

**← why:** per-tank thresholds are Aquarium Log's most-praised feature. One reviewer: *"Instead of generic standard parameters, you can customize it to your specifications."* A shrimp tank and a discus tank want different targets for the same parameter. Copy this exactly.

### `measurements`

```ts
id, tank_id → tanks.id
parameter_id → parameter_defs.id
value             real not null
measured_at       text not null
method            text               // liquid_kit | strip | probe | lab | estimate
note              text
photo_uri         text               // photo of the test vial
created_at, deleted_at
```

`method` matters more than it looks: strips and liquid kits disagree, and knowing which was used lets the app hedge appropriately instead of treating a strip reading as gospel.

### `tasks`

```ts
id, tank_id → tanks.id
livestock_id      text → livestock.id   // optional, for per-fish tasks
title             text not null
preset_type       text               // water_change | filter_clean | dose | co2_refill | trim | test | custom
rrule             text               // recurrence rule
next_due_at       text
last_done_at      text
is_active         integer
created_at, updated_at, deleted_at
```

### `push_subscriptions`

*Renamed from `scheduled_notifications` on 2026-08-31 for the web pivot — see `docs/01-architecture.md` § Notifications: Web Push. One row per browser/device that has granted push permission; a scheduled server job sends to all active subscriptions for tasks due in the current window, rather than the app scheduling individual local notifications.*

```ts
id                text primary key
device_label      text                  // e.g. "Android – Chrome", set from user agent, for the diagnostics screen
subscription_json text not null         // the PushSubscription object from the browser's Push API
created_at
last_seen_at      text
```

### `push_sends`

*Log of individual sends, for the diagnostics screen and for pruning dead subscriptions.*

```ts
id                text primary key
task_id → tasks.id
subscription_id → push_subscriptions.id
sent_at           text not null
status            text not null     // 'sent' | 'failed' | 'pruned'
```

**← why:** this table exists because of the rolling-window scheduling pattern in `01-architecture.md`. We schedule the next 30–60 individual occurrences rather than a repeating trigger, so we need to track which OS notification IDs correspond to which task in order to cancel and re-register them on reboot, timezone change or schedule edit. Without this table, editing a reminder orphans notifications that keep firing.

### `log_entries`

```ts
id, tank_id → tanks.id
type              text               // journal | maintenance | incident | treatment | water_change
body              text               // markdown
occurred_at       text not null
water_changed_pct real
created_at, updated_at, deleted_at
```

### `photos`

```ts
id, tank_id, livestock_id, log_entry_id, scan_id   // any may be null
local_uri         text not null
caption           text
taken_at          text
width, height, bytes
created_at, deleted_at
```

Photos are files on the device; this table indexes them. Nothing uploads in Phase 1.

### `scans`

```ts
id, tank_id → tanks.id
image_uri         text not null
model_name        text not null
model_version     text
prompt_version    text not null      // ← why
raw_response      text not null      // full JSON, kept forever
findings          text               // JSON array, normalised
scores            text               // JSON: {health, algae_burden, planting} — keys exactly per tank-scan/v1 (no "stocking" — dropped 2026-08-31 when livestock ID moved out of Tank Scan)
user_corrections  text               // JSON — what the user fixed
created_at
```

**← why (keep `raw_response` forever):** it is the evaluation set. When the prompt or model changes, you re-run old scans against the new version and measure whether accuracy improved. It is also what makes scan-over-time comparison possible — "your plant mass is up 40% since April" — which is the Pro feature people actually pay for. Storing it costs almost nothing; regenerating it is impossible.

`user_corrections` is how the model gets better: every time someone fixes "4 tetras" to "6 tetras", that is labelled training signal.

### `ai_interactions`

```ts
id, tank_id       text
kind              text               // ask | triage | scan | compatibility
prompt_version    text not null
user_input        text
grounding_refs    text               // JSON array of corpus entry ids cited
response          text               // JSON
input_tokens, output_tokens, cost_usd, latency_ms
rating            integer            // -1 | 0 | 1
correction_text   text
created_at
```

Every AI answer is logged with what it cited and what it cost. The `rating` and `correction_text` fields are reviewed weekly and become new corpus entries. Absolute count of "this was wrong" reports per thousand answers is a core trust metric.

### `dex_cards`

```ts
id, species_id → species.id
unlocked_at       text
unlock_source     text               // added_to_tank | scan_detected | community
times_kept        integer
first_photo_uri   text
created_at
```

Unlocking is cosmetic. **The care information on a card face is never gated** — Principle 02. Unlock the art and the collection, never the facts.

### `dismissed_warnings`

```ts
id                text primary key
tank_id           text → tanks.id
livestock_id      text → livestock.id      // optional
warning_key       text not null            // stable key for the specific warning, e.g. "compat:angelfish:neon-tetra:predation"
dismissed_at      text not null
```

**← why:** Principle 01 says warnings are dismissible **and remembered**. Without this table, a compatibility warning re-fires every time the tank is opened, which is exactly the nagging that makes people uninstall. The `warning_key` must be deterministic so the same warning is recognised across sessions.

### `settings`

```ts
key               text primary key
value             text
```

Language preference, unit display preference, onboarding state, notification diagnostics results, quota counters.

### `species_suggestions`

```ts
id                text primary key
suggested_name    text not null
note              text                      // optional free text from the person suggesting it
photo_uri         text                      // OPFS path, optional
ai_candidates     text                      // JSON array of the species-id contract's candidates — context only
status            text not null             // pending | approved | rejected
created_at        text not null
reviewed_at       text
```

**← why:** added for the Dex "All" tab's photo-scan search (`src/app/(tabs)/dex/page.tsx`) — when a scan doesn't confidently match anything already in the catalog, this lets someone flag "add this fish" instead of hitting a dead end. Reviewed by hand on the hidden `/dev/species-suggestions` screen, same pattern as `/dev/db`/`/dev/metrics`. **Local-only for now, same as every other table** — this is a real limitation worth knowing: a suggestion submitted on one phone only shows up in that phone's own review screen, never a shared one, until this gets the same kind of narrow server mirror `push_subscriptions`/`push_sends` use for reminders.

---

## Relationships at a glance

```
tanks ──┬── livestock ── livestock_events
        ├── plants
        ├── equipment
        ├── parameter_defs ── measurements
        ├── tasks ── push_sends ── push_subscriptions
        ├── log_entries
        ├── photos
        ├── scans
        └── ai_interactions

species ──┬── livestock
          ├── plants
          └── dex_cards
```

---

## Export format

Ships in T-012, before most features, deliberately.

- **JSON** — the whole database, one file, every table, restorable.
- **CSV** — one file per table in a zip, for people who want a spreadsheet.
- **Photos** — a zip of originals with a manifest mapping filenames to tanks and dates.

No account required. No Pro tier required. One tap from Settings. Users who have lost data before — and both competitors' reviews are full of them — will test this before they trust anything else in the app.

---

## Things deliberately not modelled yet

Users and accounts, sync state and conflict resolution, community posts, marketplace listings, shop directory. All Phase 2 or later. When sync arrives, the UUID primary keys and `updated_at` columns already present are what make it possible; the plan is last-write-wins per record with a conflict log, not real-time collaborative sync.
