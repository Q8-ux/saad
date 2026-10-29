CREATE TABLE `admin_rate_limits` (
	`key` text NOT NULL,
	`bucket` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_rate_limits_key_bucket_uidx` ON `admin_rate_limits` (`key`,`bucket`);--> statement-breakpoint
CREATE TABLE `admin_security_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fingerprint` text DEFAULT '' NOT NULL,
	`event_type` text NOT NULL,
	`severity` text DEFAULT 'warning' NOT NULL,
	`route` text DEFAULT '' NOT NULL,
	`staff_email` text DEFAULT '' NOT NULL,
	`detail_code` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_security_events_created_idx` ON `admin_security_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `admin_security_events_type_idx` ON `admin_security_events` (`event_type`,`created_at`);