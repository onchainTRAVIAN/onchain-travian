CREATE TABLE `saved_places` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`label` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_places_user_xy` ON `saved_places` (`user_id`,`x`,`y`);