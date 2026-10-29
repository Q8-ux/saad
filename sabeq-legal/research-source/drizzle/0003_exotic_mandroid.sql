CREATE TABLE `legal_drafting_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`source_filename` text NOT NULL,
	`source_sha256` text NOT NULL,
	`source_object_key` text NOT NULL,
	`page_count` integer NOT NULL,
	`definition_json` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`approved_by` text DEFAULT 'project_owner' NOT NULL,
	`approved_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `legal_drafting_templates_kind_version_uidx` ON `legal_drafting_templates` (`kind`,`version`);