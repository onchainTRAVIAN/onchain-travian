CREATE TABLE `medals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`week_start` integer NOT NULL,
	`category` text NOT NULL,
	`rank` integer NOT NULL,
	`value` integer NOT NULL,
	`prize` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `medals_week_cat_rank` ON `medals` (`week_start`,`category`,`rank`);--> statement-breakpoint
CREATE INDEX `medals_user_idx` ON `medals` (`user_id`);--> statement-breakpoint
CREATE TABLE `week_snapshots` (
	`user_id` integer NOT NULL,
	`week_start` integer NOT NULL,
	`off` integer NOT NULL,
	`def` integer NOT NULL,
	`loot` integer NOT NULL,
	`pop` integer NOT NULL,
	`villages` integer NOT NULL,
	PRIMARY KEY(`user_id`, `week_start`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `weeks` (
	`week_start` integer PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`finalized_at` integer
);
