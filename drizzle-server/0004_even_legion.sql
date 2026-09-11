CREATE TABLE "ai_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text,
	"kind" text,
	"prompt_version" text NOT NULL,
	"user_input" text,
	"grounding_refs" text,
	"response" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" real,
	"latency_ms" integer,
	"rating" integer,
	"correction_text" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dex_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"species_id" text NOT NULL,
	"unlocked_at" text,
	"unlock_source" text,
	"times_kept" integer,
	"first_photo_uri" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dismissed_warnings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text,
	"livestock_id" text,
	"warning_key" text NOT NULL,
	"dismissed_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parameter_defs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"target_min" real,
	"target_max" real,
	"decimals" integer,
	"sort_order" integer,
	"is_active" boolean,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text NOT NULL,
	"image_uri" text NOT NULL,
	"model_name" text NOT NULL,
	"model_version" text,
	"prompt_version" text NOT NULL,
	"raw_response" text NOT NULL,
	"findings" text,
	"scores" text,
	"user_corrections" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "species_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"suggested_name" text NOT NULL,
	"note" text,
	"photo_uri" text,
	"ai_candidates" text,
	"status" text NOT NULL,
	"created_at" text NOT NULL,
	"reviewed_at" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_key_idx" ON "user_settings" USING btree ("user_id","key");