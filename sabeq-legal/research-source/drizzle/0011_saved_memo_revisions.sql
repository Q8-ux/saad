CREATE TABLE `management_memo_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`revision` integer NOT NULL,
	`before_text` text NOT NULL,
	`after_text` text NOT NULL,
	`before_status` text NOT NULL,
	`before_error_code` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `management_memo_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `management_memo_revision_idx` ON `management_memo_revisions` (`request_id`,`revision`);--> statement-breakpoint
