CREATE TABLE "livestock_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"livestock_id" text NOT NULL,
	"type" text NOT NULL,
	"occurred_at" text NOT NULL,
	"note" text,
	"photo_uri" text,
	"created_at" text NOT NULL
);
