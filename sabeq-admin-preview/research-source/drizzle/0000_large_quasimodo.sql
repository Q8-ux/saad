CREATE TABLE `admin_ai_archive` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_email` text NOT NULL,
	`tool_type` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`input_json` text DEFAULT '{}' NOT NULL,
	`output_text` text DEFAULT '' NOT NULL,
	`sources_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_ai_archive_staff_idx` ON `admin_ai_archive` (`staff_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_ai_archive_tool_idx` ON `admin_ai_archive` (`tool_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `admin_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_email` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text DEFAULT '' NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created_idx` ON `admin_audit` (`created_at`);--> statement-breakpoint
CREATE TABLE `admin_login_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_login_challenge_email_idx` ON `admin_login_challenges` (`email`,`created_at`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`staff_email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_sessions_staff_idx` ON `admin_sessions` (`staff_email`);--> statement-breakpoint
CREATE INDEX `admin_sessions_expiry_idx` ON `admin_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `admin_staff` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'support' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`permissions_json` text DEFAULT '[]' NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_staff_email_uidx` ON `admin_staff` (`email`);--> statement-breakpoint
CREATE INDEX `admin_staff_status_idx` ON `admin_staff` (`status`);