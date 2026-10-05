CREATE TABLE `task_claims` (
	`user_id` integer NOT NULL,
	`task_id` text NOT NULL,
	`claimed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `task_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `tasks_hidden` integer DEFAULT false NOT NULL;