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
CREATE UNIQUE INDEX `wallets_address_idx` ON `wallets` (`address`);--> statement-breakpoint
ALTER TABLE `movements` ADD `hero` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `movements` ADD `merchants` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tiles` ADD `animals` text;--> statement-breakpoint
ALTER TABLE `tiles` ADD `animals_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `muted_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `villages` ADD `research` text DEFAULT '[1,0,0,0,0,0,0,0,0,0]' NOT NULL;--> statement-breakpoint
ALTER TABLE `villages` ADD `smithy` text DEFAULT '[0,0,0,0,0,0,0,0,0,0]' NOT NULL;--> statement-breakpoint
ALTER TABLE `villages` ADD `expansions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `villages` ADD `parent_id` integer;