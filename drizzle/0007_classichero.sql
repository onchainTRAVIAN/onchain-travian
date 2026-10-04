ALTER TABLE `heroes` ADD `unit_slot` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `heroes` ADD `def_points` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `heroes` ADD `regen` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tiles` ADD `oasis_loyalty` real DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `tiles` ADD `oasis_loyalty_at` integer;--> statement-breakpoint
-- Classic hero: existing heroes keep level/XP, get their points back to redistribute (no production skill).
UPDATE `heroes` SET `strength` = 0, `off_bonus` = 0, `def_bonus` = 0, `production` = 0, `def_points` = 0, `regen` = 0, `unit_slot` = 0;
