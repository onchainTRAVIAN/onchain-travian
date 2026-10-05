CREATE TABLE `oasis_troops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`owner_village_id` integer NOT NULL,
	`units` text NOT NULL,
	FOREIGN KEY (`owner_village_id`) REFERENCES `villages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oasis_troops_loc_owner_idx` ON `oasis_troops` (`x`,`y`,`owner_village_id`);--> statement-breakpoint
CREATE INDEX `oasis_troops_owner_idx` ON `oasis_troops` (`owner_village_id`);