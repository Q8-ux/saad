-- Schema-only CI fixture exported from the deployed Sabeq schema; no legislation seed or client rows.
CREATE TABLE IF NOT EXISTS `api_rate_limits` (
	`key` text NOT NULL,
	`bucket` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `api_rate_limits_key_bucket_uidx` ON `api_rate_limits` (`key`,`bucket`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `consultation_requests` (
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
);

CREATE INDEX IF NOT EXISTS `consultation_requests_status_idx` ON `consultation_requests` (`status`,`created_at`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `contact_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`language` text DEFAULT 'ar' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS `contact_messages_status_idx` ON `contact_messages` (`status`,`created_at`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legal_chunks` (
	`id` integer PRIMARY KEY NOT NULL,
	`document_id` integer NOT NULL,
	`chunk_index` integer NOT NULL,
	`reference` text,
	`text` text NOT NULL,
	`search_terms` text DEFAULT '' NOT NULL,
	`char_start` integer DEFAULT 0 NOT NULL,
	`char_end` integer DEFAULT 0 NOT NULL,
	`arabic_ratio` real NOT NULL,
	`quality_score` integer NOT NULL,
	`verified` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `legal_documents`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `legal_chunks_document_idx` ON `legal_chunks` (`document_id`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `legal_chunks_verified_idx` ON `legal_chunks` (`verified`);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `legal_chunks_document_position_uidx` ON `legal_chunks` (`document_id`,`chunk_index`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legal_document_sources` (
	`id` integer PRIMARY KEY NOT NULL,
	`document_id` integer NOT NULL,
	`source_url` text NOT NULL,
	`source_label` text NOT NULL,
	`source_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `legal_documents`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `legal_sources_document_idx` ON `legal_document_sources` (`document_id`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legal_documents` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`source_page` text DEFAULT '' NOT NULL,
	`official_source` text DEFAULT '' NOT NULL,
	`document_type` text DEFAULT 'مستند قانوني' NOT NULL,
	`law_number` integer,
	`law_year` integer,
	`category` text DEFAULT 'تشريعات عامة' NOT NULL,
	`original_category` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`keywords_json` text DEFAULT '[]' NOT NULL,
	`search_text` text DEFAULT '' NOT NULL,
	`page_count` integer,
	`article_count` integer DEFAULT 0 NOT NULL,
	`source_type` text DEFAULT 'unknown' NOT NULL,
	`has_verified_text` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `legal_documents_source_url_uidx` ON `legal_documents` (`source_url`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `legal_documents_category_idx` ON `legal_documents` (`category`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `legal_documents_year_idx` ON `legal_documents` (`law_year`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `legal_documents_verified_idx` ON `legal_documents` (`has_verified_text`);

CREATE TABLE IF NOT EXISTS `email_verification_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS `email_verification_email_idx` ON `email_verification_challenges` (`email`,`created_at`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `email_verification_expiry_idx` ON `email_verification_challenges` (`expires_at`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `public_user_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `public_users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `public_user_sessions_user_idx` ON `public_user_sessions` (`user_id`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `public_user_sessions_expiry_idx` ON `public_user_sessions` (`expires_at`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `public_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`email_verified_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `public_users_email_uidx` ON `public_users` (`email`);

CREATE TABLE IF NOT EXISTS `service_records` (
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

CREATE INDEX IF NOT EXISTS `service_records_user_idx` ON `service_records` (`user_id`,`created_at`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `service_records_type_idx` ON `service_records` (`service_type`,`created_at`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `service_settings` (
	`service_key` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`payment_required` integer DEFAULT false NOT NULL,
	`price_fils` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'KWD' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `legal_drafting_templates` (
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

CREATE UNIQUE INDEX IF NOT EXISTS `legal_drafting_templates_kind_version_uidx` ON `legal_drafting_templates` (`kind`,`version`);

CREATE TABLE IF NOT EXISTS `official_article_records` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` integer NOT NULL,
	`chunk_id` integer,
	`law_number` integer,
	`law_year` integer,
	`article_number` text NOT NULL,
	`text` text NOT NULL,
	`source_url` text NOT NULL,
	`page` integer NOT NULL,
	`source_sha256` text NOT NULL,
	`text_sha256` text NOT NULL,
	`status` text NOT NULL,
	`legal_status` text NOT NULL,
	`checked_at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `official_articles_identity_idx` ON `official_article_records` (`law_number`,`law_year`,`article_number`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `official_articles_status_idx` ON `official_article_records` (`status`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `official_source_checks` (
	`source_url` text PRIMARY KEY NOT NULL,
	`document_id` integer NOT NULL,
	`source_sha256` text,
	`status` text NOT NULL,
	`checked_at` text NOT NULL,
	`metadata_json` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `management_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `management_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipients` text NOT NULL,
	`subject` text NOT NULL,
	`body_text` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `management_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `management_login_codes` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`challenge` text NOT NULL,
	`expires_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `management_memo_requests` (
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

CREATE INDEX IF NOT EXISTS `management_memos_created_idx` ON `management_memo_requests` (`created_at`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `management_read_states` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`event_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `management_read_identity_idx` ON `management_read_states` (`email`,`event_id`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `management_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `management_vault` (
	`integration` text PRIMARY KEY NOT NULL,
	`sealed` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `sadad_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`input_hash` text NOT NULL,
	`environment` text NOT NULL,
	`amount_fils` integer NOT NULL,
	`currency` text DEFAULT 'KWD' NOT NULL,
	`reference` text NOT NULL,
	`invoice_id` text,
	`invoice_key` text,
	`transaction_id` text,
	`status` text DEFAULT 'creating' NOT NULL,
	`generation_id` text,
	`lease_until` integer,
	`result_json` text,
	`result_expires_at` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `sadad_invoice_uidx` ON `sadad_payments` (`environment`,`invoice_id`);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `sadad_transaction_uidx` ON `sadad_payments` (`environment`,`transaction_id`);

CREATE TABLE IF NOT EXISTS `legislation_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`document_id` text NOT NULL,
	`component_id` text NOT NULL,
	`number` text NOT NULL,
	`heading` text NOT NULL,
	`start_page` integer NOT NULL,
	`end_page` integer NOT NULL,
	`text` text NOT NULL,
	`text_sha256` text NOT NULL,
	`segments_json` text NOT NULL,
	`boundary_review` text NOT NULL,
	`transcription_verified` integer DEFAULT false NOT NULL,
	`complete_article_verified` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `legislation_imports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `legislation_sections`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `legislation_articles_source_idx` ON `legislation_articles` (`source_id`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `legislation_articles_identity_idx` ON `legislation_articles` (`document_id`,`component_id`,`number`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legislation_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`source_sha256` text NOT NULL,
	`source_bytes` integer NOT NULL,
	`edition_claim` text NOT NULL,
	`page_count` integer NOT NULL,
	`section_count` integer NOT NULL,
	`article_count` integer NOT NULL,
	`provenance` text DEFAULT 'user_document' NOT NULL,
	`current_law_verified` integer DEFAULT false NOT NULL,
	`active_for_generation` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'importing' NOT NULL,
	`metadata_json` text NOT NULL,
	`imported_at` text
);

CREATE UNIQUE INDEX IF NOT EXISTS `legislation_import_sha_uidx` ON `legislation_imports` (`source_sha256`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legislation_pages` (
	`source_id` text NOT NULL,
	`pdf_page` integer NOT NULL,
	`document_id` text,
	`printed_page` text,
	`role` text NOT NULL,
	`text` text NOT NULL,
	`text_sha256` text NOT NULL,
	`search_text` text NOT NULL,
	`quality_flags_json` text NOT NULL,
	PRIMARY KEY(`source_id`, `pdf_page`),
	FOREIGN KEY (`source_id`) REFERENCES `legislation_imports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `legislation_sections`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `legislation_pages_document_idx` ON `legislation_pages` (`document_id`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legislation_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`start_page` integer NOT NULL,
	`end_page` integer NOT NULL,
	`kind` text NOT NULL,
	`boundary_method` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `legislation_imports`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `legislation_sections_source_idx` ON `legislation_sections` (`source_id`);

CREATE TABLE IF NOT EXISTS `legislation_audit_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`review_id` text NOT NULL,
	`title` text NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `legislation_imports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`review_id`) REFERENCES `legislation_reviews`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `legislation_reports_source_idx` ON `legislation_audit_reports` (`source_id`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legislation_currency_checks` (
	`source_id` text NOT NULL,
	`section_id` text NOT NULL,
	`review_id` text NOT NULL,
	`identity_json` text NOT NULL,
	`status` text NOT NULL,
	`official_sources_json` text NOT NULL,
	`findings_json` text NOT NULL,
	`current_law_verified` integer DEFAULT false NOT NULL,
	`checked_at` text NOT NULL,
	PRIMARY KEY(`source_id`, `section_id`),
	FOREIGN KEY (`source_id`) REFERENCES `legislation_imports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`review_id`) REFERENCES `legislation_reviews`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `legislation_currency_review_idx` ON `legislation_currency_checks` (`review_id`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legislation_image_reviews` (
	`source_id` text NOT NULL,
	`pdf_page` integer NOT NULL,
	`review_id` text NOT NULL,
	`xref` integer NOT NULL,
	`source_image_sha256` text NOT NULL,
	`verified_text` text NOT NULL,
	`text_sha256` text NOT NULL,
	`rows_json` text NOT NULL,
	`unresolved_json` text NOT NULL,
	`full_transcription_verified` integer DEFAULT false NOT NULL,
	`review_method` text NOT NULL,
	`object_key` text NOT NULL,
	`reviewed_at` text NOT NULL,
	PRIMARY KEY(`source_id`, `pdf_page`),
	FOREIGN KEY (`source_id`) REFERENCES `legislation_imports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`review_id`) REFERENCES `legislation_reviews`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `legislation_image_review_idx` ON `legislation_image_reviews` (`review_id`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `legislation_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_sha256` text NOT NULL,
	`payload_sha256` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`summary_json` text NOT NULL,
	`details_json` text NOT NULL,
	`asset_receipts_json` text DEFAULT '{}' NOT NULL,
	`reviewed_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`source_id`) REFERENCES `legislation_imports`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `user_access_policies` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `public_users`(`id`) ON DELETE CASCADE,
  `role` text DEFAULT 'user' NOT NULL,
  `permissions_json` text DEFAULT '{}' NOT NULL,
  `updated_by` text NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `management_memo_revisions` (
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

CREATE UNIQUE INDEX IF NOT EXISTS `management_memo_revision_idx` ON `management_memo_revisions` (`request_id`,`revision`);--> statement-breakpoint
