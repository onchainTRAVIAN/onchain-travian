ALTER TABLE `reports` ADD `from_x` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `from_y` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `to_x` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `to_y` integer;--> statement-breakpoint
CREATE INDEX `reports_user_to_idx` ON `reports` (`user_id`,`to_x`,`to_y`);--> statement-breakpoint
CREATE INDEX `reports_user_from_idx` ON `reports` (`user_id`,`from_x`,`from_y`);