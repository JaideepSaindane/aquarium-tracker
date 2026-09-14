CREATE TABLE "community_comment_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"comment_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "community_comment_likes_user_comment_idx" ON "community_comment_likes" USING btree ("user_id","comment_id");