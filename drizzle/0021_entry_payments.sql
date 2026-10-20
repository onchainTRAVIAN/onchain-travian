CREATE TABLE `entry_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`payer` text NOT NULL,
	`amount` text NOT NULL,
	`usd_cents` integer NOT NULL,
	`block_number` integer NOT NULL,
	`user_id` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entry_payments_payer_idx` ON `entry_payments` (`payer`);