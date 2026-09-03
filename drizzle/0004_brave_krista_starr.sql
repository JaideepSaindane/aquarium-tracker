CREATE TABLE `species_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`suggested_name` text NOT NULL,
	`note` text,
	`photo_uri` text,
	`ai_candidates` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
