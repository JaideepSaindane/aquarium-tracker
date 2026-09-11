CREATE TABLE "equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"brand" text,
	"model" text,
	"wattage" real,
	"rated_lph" real,
	"installed_on" text,
	"service_interval_days" integer,
	"last_serviced_on" text,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text NOT NULL,
	"type" text,
	"body" text,
	"occurred_at" text NOT NULL,
	"water_changed_pct" real,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text,
	"livestock_id" text,
	"log_entry_id" text,
	"scan_id" text,
	"local_uri" text NOT NULL,
	"caption" text,
	"taken_at" text,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"created_at" text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text NOT NULL,
	"species_id" text,
	"common_name" text,
	"planted_on" text,
	"quantity" integer,
	"light_need" text,
	"co2_need" text,
	"trim_interval_days" integer,
	"last_trimmed_on" text,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text
);
