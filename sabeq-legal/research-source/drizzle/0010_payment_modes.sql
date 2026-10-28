CREATE TABLE `payment_mode_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`previous_mode` text NOT NULL,
	`next_mode` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_runtime_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'real' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_by` text DEFAULT 'migration' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_test_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`management_session_hash` text NOT NULL,
	`actor` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `sadad_payments` ADD `provider` text DEFAULT 'sadad' NOT NULL;--> statement-breakpoint
ALTER TABLE `sadad_payments` ADD `test_actor` text;
--> statement-breakpoint
INSERT INTO `payment_runtime_settings` (`id`, `mode`) VALUES ('memo', 'real');
