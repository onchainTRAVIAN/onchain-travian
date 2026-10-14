CREATE TABLE `signup_tickets` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`expires_at` integer NOT NULL
);
