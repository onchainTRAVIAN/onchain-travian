CREATE TABLE `market_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`village_id` integer,
	`kind` text NOT NULL,
	`tribe` text NOT NULL,
	`goods` text NOT NULL,
	`units` text NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`buyer_id` integer,
	`created_at` integer NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `market_open_idx` ON `market_listings` (`status`,`kind`);--> statement-breakpoint
CREATE INDEX `market_seller_idx` ON `market_listings` (`seller_id`);