-- Schema only, derived from the native migrations; no records or legal corpus seed.
CREATE TABLE `public_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`email_verified_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
, `status` text DEFAULT 'active' NOT NULL, `memo_limit` integer DEFAULT 3 NOT NULL, `assistant_limit` integer DEFAULT 20 NOT NULL);

CREATE TABLE `service_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`service_type` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`input_text` text DEFAULT '' NOT NULL,
	`output_text` text DEFAULT '' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `public_users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `contact_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`language` text DEFAULT 'ar' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
, `user_id` text);

CREATE TABLE `consultation_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`case_type` text NOT NULL,
	`preferred_contact` text DEFAULT 'WhatsApp' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`language` text DEFAULT 'ar' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
, `user_id` text);
