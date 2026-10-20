CREATE TABLE `management_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `management_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipients` text NOT NULL,
	`subject` text NOT NULL,
	`body_text` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `management_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `management_login_codes` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`challenge` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `management_memo_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`client_name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`case_type` text NOT NULL,
	`case_number` text DEFAULT '' NOT NULL,
	`input_json` text NOT NULL,
	`output_text` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`error_code` text DEFAULT '' NOT NULL,
	`origin` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `management_memos_created_idx` ON `management_memo_requests` (`created_at`);--> statement-breakpoint
CREATE TABLE `management_read_states` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`event_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `management_read_identity_idx` ON `management_read_states` (`email`,`event_id`);--> statement-breakpoint
CREATE TABLE `management_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `management_vault` (
	`integration` text PRIMARY KEY NOT NULL,
	`sealed` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
