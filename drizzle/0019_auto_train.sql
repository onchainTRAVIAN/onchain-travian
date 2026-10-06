CREATE TABLE `auto_trains` (
	`village_id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`hours` integer NOT NULL,
	`started_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`last_run_at` integer NOT NULL,
	`items` text NOT NULL,
	`seen` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auto_trains_active_idx` ON `auto_trains` (`active`);