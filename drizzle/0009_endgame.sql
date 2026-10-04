CREATE TABLE `artifacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`size` text NOT NULL,
	`village_id` integer,
	`active_at` integer NOT NULL,
	`captured_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `artifacts_village_idx` ON `artifacts` (`village_id`);--> statement-breakpoint
ALTER TABLE `villages` ADD `wonder` integer DEFAULT false NOT NULL;