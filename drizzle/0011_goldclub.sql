CREATE TABLE `farm_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`units` text NOT NULL,
	`last_sent_at` integer,
	`last_result` text,
	`last_loot` integer,
	`last_note` text,
	FOREIGN KEY (`list_id`) REFERENCES `farm_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `farm_entries_list_idx` ON `farm_entries` (`list_id`);--> statement-breakpoint
CREATE TABLE `farm_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`village_id` integer NOT NULL,
	`name` text NOT NULL,
	`auto_minutes` integer,
	`last_run_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `farm_lists_user_idx` ON `farm_lists` (`user_id`);--> statement-breakpoint
CREATE TABLE `trade_routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`from_village_id` integer NOT NULL,
	`to_village_id` integer NOT NULL,
	`goods` text NOT NULL,
	`hour` integer NOT NULL,
	`per_day` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_run_at` integer,
	`last_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trade_routes_from_idx` ON `trade_routes` (`from_village_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `gold_club` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `villages` ADD `evade` integer DEFAULT false NOT NULL;