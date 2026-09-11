CREATE TABLE "community_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "community_likes_user_post_idx" ON "community_likes" USING btree ("user_id","post_id");