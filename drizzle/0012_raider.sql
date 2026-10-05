CREATE TABLE `farm_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `farm_blocks_idx` ON `farm_blocks` (`user_id`,`x`,`y`);--> statement-breakpoint
CREATE TABLE `oasis_raiders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`village_id` integer NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`radius` integer DEFAULT 10 NOT NULL,
	`min_res` integer DEFAULT 1000 NOT NULL,
	`max_animals` integer DEFAULT 0 NOT NULL,
	`allowed` text NOT NULL,
	`reserve` text NOT NULL,
	`size_mode` text DEFAULT 'auto' NOT NULL,
	`fixed` text NOT NULL,
	`max_per_raid` integer DEFAULT 0 NOT NULL,
	`interval_min` integer DEFAULT 10 NOT NULL,
	`max_raids` integer DEFAULT 20 NOT NULL,
	`last_run_at` integer,
	`day_key` integer DEFAULT 0 NOT NULL,
	`day_raids` integer DEFAULT 0 NOT NULL,
	`log` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oasis_raiders_village_idx` ON `oasis_raiders` (`village_id`);