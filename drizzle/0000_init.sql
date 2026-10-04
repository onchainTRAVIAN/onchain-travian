CREATE TABLE `build_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`village_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`building` text NOT NULL,
	`to_level` integer NOT NULL,
	`start_at` integer NOT NULL,
	`finish_at` integer NOT NULL,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `build_orders_finish_idx` ON `build_orders` (`finish_at`);--> statement-breakpoint
CREATE INDEX `build_orders_village_idx` ON `build_orders` (`village_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_user_id` integer,
	`to_user_id` integer NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`deleted_by_sender` integer DEFAULT false NOT NULL,
	`deleted_by_recipient` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_to_idx` ON `messages` (`to_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_from_idx` ON `messages` (`from_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`from_village_id` integer NOT NULL,
	`to_village_id` integer,
	`origin_x` integer NOT NULL,
	`origin_y` integer NOT NULL,
	`to_x` integer NOT NULL,
	`to_y` integer NOT NULL,
	`units` text NOT NULL,
	`loot` text,
	`catapult_target` text,
	`depart_at` integer NOT NULL,
	`arrive_at` integer NOT NULL,
	FOREIGN KEY (`from_village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `movements_arrive_idx` ON `movements` (`arrive_at`);--> statement-breakpoint
CREATE INDEX `movements_from_idx` ON `movements` (`from_village_id`);--> statement-breakpoint
CREATE INDEX `movements_to_idx` ON `movements` (`to_village_id`);--> statement-breakpoint
CREATE TABLE `perks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`value` real NOT NULL,
	`source` text NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `perks_user_idx` ON `perks` (`user_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reports_user_idx` ON `reports` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`csrf` text NOT NULL,
	`village_id` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `slots` (
	`village_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`building` text,
	`level` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`village_id`, `slot`),
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tiles` (
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`kind` text NOT NULL,
	`layout` text,
	`oasis` text,
	`village_id` integer,
	PRIMARY KEY(`x`, `y`)
);
--> statement-breakpoint
CREATE INDEX `tiles_village_idx` ON `tiles` (`village_id`);--> statement-breakpoint
CREATE TABLE `train_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`village_id` integer NOT NULL,
	`building` text NOT NULL,
	`unit_slot` integer NOT NULL,
	`total` integer NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`per_unit_ms` integer NOT NULL,
	`start_at` integer NOT NULL,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `train_orders_village_idx` ON `train_orders` (`village_id`);--> statement-breakpoint
CREATE TABLE `troops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`village_id` integer NOT NULL,
	`owner_village_id` integer NOT NULL,
	`units` text NOT NULL,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `troops_loc_owner_idx` ON `troops` (`village_id`,`owner_village_id`);--> statement-breakpoint
CREATE INDEX `troops_owner_idx` ON `troops` (`owner_village_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`username_lower` text NOT NULL,
	`password_hash` text NOT NULL,
	`tribe` text NOT NULL,
	`role` text DEFAULT 'player' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`protected_until` integer NOT NULL,
	`off_points` integer DEFAULT 0 NOT NULL,
	`def_points` integer DEFAULT 0 NOT NULL,
	`loot_total` integer DEFAULT 0 NOT NULL,
	`culture_points` real DEFAULT 0 NOT NULL,
	`culture_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_lower_idx` ON `users` (`username_lower`);--> statement-breakpoint
CREATE TABLE `villages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`is_capital` integer DEFAULT false NOT NULL,
	`wood` real NOT NULL,
	`clay` real NOT NULL,
	`iron` real NOT NULL,
	`crop` real NOT NULL,
	`res_at` integer NOT NULL,
	`pop` integer DEFAULT 0 NOT NULL,
	`loyalty` real DEFAULT 100 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `villages_xy_idx` ON `villages` (`x`,`y`);--> statement-breakpoint
CREATE INDEX `villages_user_idx` ON `villages` (`user_id`);