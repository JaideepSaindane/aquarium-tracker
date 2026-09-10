CREATE TABLE "livestock" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text NOT NULL,
	"species_id" text NOT NULL,
	"nickname" text,
	"count" integer DEFAULT 1 NOT NULL,
	"added_on" text NOT NULL,
	"removed_on" text,
	"status" text,
	"death_cause" text,
	"source" text,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tank_id" text NOT NULL,
	"parameter_id" text NOT NULL,
	"value" real NOT NULL,
	"measured_at" text NOT NULL,
	"method" text,
	"note" text,
	"photo_uri" text,
	"created_at" text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"username" text,
	"city" text,
	"email" text,
	"contact" text,
	"photo_uri" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tanks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"photo_uri" text,
	"length_cm" real NOT NULL,
	"width_cm" real NOT NULL,
	"height_cm" real NOT NULL,
	"volume_l" real NOT NULL,
	"shape" text,
	"status" text,
	"water_type" text,
	"is_planted" boolean,
	"has_co2" boolean,
	"setup_type" text,
	"city" text,
	"started_on" text,
	"substrate" text,
	"notes" text,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"google_id" text,
	"phone" text,
	"pin_hash" text,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_id_idx" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");