CREATE TABLE `alliance_diplomacy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_id` integer NOT NULL,
	`to_id` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_id`) REFERENCES `alliances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `alliances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `alliance_diplomacy_from_idx` ON `alliance_diplomacy` (`from_id`);--> statement-breakpoint
CREATE INDEX `alliance_diplomacy_to_idx` ON `alliance_diplomacy` (`to_id`);--> statement-breakpoint
CREATE TABLE `alliance_invites` (
	`alliance_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`invited_by` integer,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`alliance_id`, `user_id`),
	FOREIGN KEY (`alliance_id`) REFERENCES `alliances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `alliance_members` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`alliance_id` integer NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`alliance_id`) REFERENCES `alliances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `alliance_members_alliance_idx` ON `alliance_members` (`alliance_id`);--> statement-breakpoint
CREATE TABLE `alliances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tag` text NOT NULL,
	`tag_lower` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`founder_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`founder_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alliances_tag_idx` ON `alliances` (`tag_lower`);--> statement-breakpoint
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
CREATE TABLE `celebrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`village_id` integer NOT NULL,
	`kind` text NOT NULL,
	`culture_points` integer NOT NULL,
	`start_at` integer NOT NULL,
	`finish_at` integer NOT NULL,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `celebrations_finish_idx` ON `celebrations` (`finish_at`);--> statement-breakpoint
CREATE INDEX `celebrations_village_idx` ON `celebrations` (`village_id`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`alliance_id` integer,
	`user_id` integer NOT NULL,
	`body` text NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`alliance_id`) REFERENCES `alliances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_channel_idx` ON `chat_messages` (`alliance_id`,`id`);--> statement-breakpoint
CREATE TABLE `credits_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`idem_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credits_idem_idx` ON `credits_ledger` (`idem_key`);--> statement-breakpoint
CREATE INDEX `credits_user_idx` ON `credits_ledger` (`user_id`);--> statement-breakpoint
CREATE TABLE `deposits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`payer` text NOT NULL,
	`asset` text NOT NULL,
	`amount` text NOT NULL,
	`credits` integer NOT NULL,
	`block_number` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `deposits_user_idx` ON `deposits` (`user_id`);--> statement-breakpoint
CREATE TABLE `heroes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`home_village_id` integer NOT NULL,
	`location_id` integer,
	`status` text DEFAULT 'home' NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`health` real DEFAULT 100 NOT NULL,
	`health_at` integer NOT NULL,
	`strength` integer DEFAULT 0 NOT NULL,
	`off_bonus` integer DEFAULT 0 NOT NULL,
	`def_bonus` integer DEFAULT 0 NOT NULL,
	`production` integer DEFAULT 0 NOT NULL,
	`revive_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`home_village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `heroes_user_idx` ON `heroes` (`user_id`);--> statement-breakpoint
CREATE TABLE `holder_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`address` text NOT NULL,
	`balance` text NOT NULL,
	`total_supply` text NOT NULL,
	`taken_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `holder_snapshots_addr_idx` ON `holder_snapshots` (`address`,`taken_at`);--> statement-breakpoint
CREATE TABLE `market_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`village_id` integer NOT NULL,
	`offer_res` text NOT NULL,
	`offer_amount` integer NOT NULL,
	`want_res` text NOT NULL,
	`want_amount` integer NOT NULL,
	`merchants` integer NOT NULL,
	`max_hours` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `market_offers_village_idx` ON `market_offers` (`village_id`);--> statement-breakpoint
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
	`hero` integer DEFAULT false NOT NULL,
	`merchants` integer DEFAULT 0 NOT NULL,
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
CREATE TABLE `research_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`village_id` integer NOT NULL,
	`kind` text NOT NULL,
	`unit_slot` integer NOT NULL,
	`to_level` integer NOT NULL,
	`start_at` integer NOT NULL,
	`finish_at` integer NOT NULL,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `research_orders_finish_idx` ON `research_orders` (`finish_at`);--> statement-breakpoint
CREATE INDEX `research_orders_village_idx` ON `research_orders` (`village_id`);--> statement-breakpoint
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
CREATE TABLE `ticker_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`body` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ticker_time_idx` ON `ticker_messages` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE TABLE `tiles` (
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`kind` text NOT NULL,
	`layout` text,
	`oasis` text,
	`village_id` integer,
	`animals` text,
	`animals_at` integer,
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
	`culture_at` integer DEFAULT 0 NOT NULL,
	`muted_until` integer DEFAULT 0 NOT NULL
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
	`research` text DEFAULT '[1,0,0,0,0,0,0,0,0,0]' NOT NULL,
	`blacksmith` text DEFAULT '[0,0,0,0,0,0,0,0,0,0]' NOT NULL,
	`armoury` text DEFAULT '[0,0,0,0,0,0,0,0,0,0]' NOT NULL,
	`prisoners` text DEFAULT '{}' NOT NULL,
	`expansions` integer DEFAULT 0 NOT NULL,
	`parent_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `villages_xy_idx` ON `villages` (`x`,`y`);--> statement-breakpoint
CREATE INDEX `villages_user_idx` ON `villages` (`user_id`);--> statement-breakpoint
CREATE TABLE `wallet_nonces` (
	`nonce` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`linked_at` integer NOT NULL,
	`tier` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_address_idx` ON `wallets` (`address`);