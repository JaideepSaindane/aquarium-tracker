CREATE TABLE `ai_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text,
	`kind` text,
	`prompt_version` text NOT NULL,
	`user_input` text,
	`grounding_refs` text,
	`response` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_usd` real,
	`latency_ms` integer,
	`rating` integer,
	`correction_text` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dex_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`species_id` text NOT NULL,
	`unlocked_at` text,
	`unlock_source` text,
	`times_kept` integer,
	`first_photo_uri` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dismissed_warnings` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text,
	`livestock_id` text,
	`warning_key` text NOT NULL,
	`dismissed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text NOT NULL,
	`type` text NOT NULL,
	`subtype` text,
	`brand` text,
	`model` text,
	`wattage` real,
	`rated_lph` real,
	`installed_on` text,
	`service_interval_days` integer,
	`last_serviced_on` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `livestock` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text NOT NULL,
	`species_id` text NOT NULL,
	`nickname` text,
	`count` integer DEFAULT 1 NOT NULL,
	`added_on` text NOT NULL,
	`removed_on` text,
	`status` text,
	`death_cause` text,
	`source` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `livestock_events` (
	`id` text PRIMARY KEY NOT NULL,
	`livestock_id` text NOT NULL,
	`type` text NOT NULL,
	`occurred_at` text NOT NULL,
	`note` text,
	`photo_uri` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text NOT NULL,
	`type` text,
	`body` text,
	`occurred_at` text NOT NULL,
	`water_changed_pct` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text NOT NULL,
	`parameter_id` text NOT NULL,
	`value` real NOT NULL,
	`measured_at` text NOT NULL,
	`method` text,
	`note` text,
	`photo_uri` text,
	`created_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `parameter_defs` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`target_min` real,
	`target_max` real,
	`decimals` integer,
	`sort_order` integer,
	`is_active` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text,
	`livestock_id` text,
	`log_entry_id` text,
	`scan_id` text,
	`local_uri` text NOT NULL,
	`caption` text,
	`taken_at` text,
	`width` integer,
	`height` integer,
	`bytes` integer,
	`created_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `plants` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text NOT NULL,
	`species_id` text,
	`common_name` text,
	`planted_on` text,
	`quantity` integer,
	`light_need` text,
	`co2_need` text,
	`trim_interval_days` integer,
	`last_trimmed_on` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `push_sends` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`sent_at` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`device_label` text,
	`subscription_json` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text NOT NULL,
	`image_uri` text NOT NULL,
	`model_name` text NOT NULL,
	`model_version` text,
	`prompt_version` text NOT NULL,
	`raw_response` text NOT NULL,
	`findings` text,
	`scores` text,
	`user_corrections` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `species` (
	`id` text PRIMARY KEY NOT NULL,
	`scientific_name` text NOT NULL,
	`common_names` text,
	`common_names_in` text,
	`category` text,
	`verified` integer DEFAULT false NOT NULL,
	`source_refs` text,
	`temp_c_min` real,
	`temp_c_max` real,
	`ph_min` real,
	`ph_max` real,
	`hardness_dgh_min` real,
	`hardness_dgh_max` real,
	`adult_size_cm` real,
	`min_volume_l` real,
	`min_footprint_length_cm` real,
	`min_footprint_width_cm` real,
	`social_min_group` integer,
	`temperament` text,
	`swim_level` text,
	`diet` text,
	`difficulty` text,
	`lifespan_min_years` real,
	`lifespan_max_years` real,
	`breeding` text,
	`care_notes` text,
	`common_mistakes` text,
	`incompatible_with` text,
	`disputed` text,
	`origin` text NOT NULL,
	`uncertainty_note` text,
	`ai_confidence` text,
	`flags` text,
	`dex_rarity` text,
	`dex_tier` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tanks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`photo_uri` text,
	`length_cm` real NOT NULL,
	`width_cm` real NOT NULL,
	`height_cm` real NOT NULL,
	`volume_l` real NOT NULL,
	`shape` text,
	`status` text,
	`water_type` text,
	`is_planted` integer,
	`has_co2` integer,
	`city` text,
	`started_on` text,
	`substrate` text,
	`notes` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text NOT NULL,
	`livestock_id` text,
	`title` text NOT NULL,
	`preset_type` text,
	`rrule` text,
	`next_due_at` text,
	`last_done_at` text,
	`is_active` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
