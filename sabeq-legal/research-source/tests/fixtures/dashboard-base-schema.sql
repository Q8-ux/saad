-- Test-only schema derived from native migrations. No legal corpus, client data or production seed records.
-- Native source: 4eef6556e4964d99598ade7d08d0ca9a0e57ea38.


CREATE TABLE `api_rate_limits` (
	`key` text NOT NULL,
	`bucket` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX `api_rate_limits_key_bucket_uidx` ON `api_rate_limits` (`key`,`bucket`);

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
);

CREATE INDEX `consultation_requests_status_idx` ON `consultation_requests` (`status`,`created_at`);

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
);

CREATE INDEX `contact_messages_status_idx` ON `contact_messages` (`status`,`created_at`);

CREATE TABLE `legal_chunks` (
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

CREATE INDEX `legal_chunks_document_idx` ON `legal_chunks` (`document_id`);

CREATE INDEX `legal_chunks_verified_idx` ON `legal_chunks` (`verified`);

CREATE UNIQUE INDEX `legal_chunks_document_position_uidx` ON `legal_chunks` (`document_id`,`chunk_index`);

CREATE TABLE `legal_document_sources` (
	`id` integer PRIMARY KEY NOT NULL,
	`document_id` integer NOT NULL,
	`source_url` text NOT NULL,
	`source_label` text NOT NULL,
	`source_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `legal_documents`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `legal_sources_document_idx` ON `legal_document_sources` (`document_id`);

CREATE TABLE `legal_documents` (
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

CREATE UNIQUE INDEX `legal_documents_source_url_uidx` ON `legal_documents` (`source_url`);

CREATE INDEX `legal_documents_category_idx` ON `legal_documents` (`category`);

CREATE INDEX `legal_documents_year_idx` ON `legal_documents` (`law_year`);

CREATE INDEX `legal_documents_verified_idx` ON `legal_documents` (`has_verified_text`);

-- SABEQ_LEGAL_SEED_START
INSERT INTO legal_documents (id,title,source_url,source_page,official_source,document_type,law_number,law_year,category,original_category,summary,keywords_json,search_text,page_count,article_count,source_type,has_verified_text,status,created_at,updated_at) VALUES (1,'الدستور الكويتي','https://moj.gov.kw/AR/Documents/MojDocs/%D8%AF%D8%B3%D8%AA%D9%88%D8%B1%20%D8%A7%D9%84%D9%83%D9%88%D9%8A%D8%AA.pdf','https://moj.gov.kw/AR/Pages/MojLaws.aspx','وزارة العدل الكويتية','دستور',NULL,NULL,'دستوري وقضائي','دستوري وقضائي','دستور. التصنيف الموضوعي: دستوري وقضائي. عدد صفحات الملف: 365. تم التعرف آليًا على 10 مادة مرقمة. يتضمن العنوان أو النص مؤشرات إلى تعديل أو إلغاء تشريعي، ويجب ربطه بالنص الأصلي قبل الاعتماد.','["دستوري وقضائي","الدستور","المرافعات","القانون المدني","التجارة","الجزاء","العمل","التأمين","الإعلام","التنفيذ","المحكمة الدستورية"]','الدستور الكويتي دستور التصنيف الموضوعي دستوري وقضايي عدد صفحات الملف 365 تم التعرف اليا علي 10 ماده مرقمه يتضمن العنوان او النص موشرات الي تعديل الغاء تشريعي ويجب ربطه بالنص الاصلي قبل الاعتماد المرافعات القانون المدني التجاره الجزاء العمل التامين الاعلام التنفيذ المحكمه الدستوريه',365,10,'official_moj',1,'ready','2026-08-16 13:24:04','2026-08-16 14:50:33');

CREATE TABLE `email_verification_challenges` (
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

CREATE INDEX `email_verification_email_idx` ON `email_verification_challenges` (`email`,`created_at`);

CREATE INDEX `email_verification_expiry_idx` ON `email_verification_challenges` (`expires_at`);

CREATE TABLE `public_user_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `public_users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `public_user_sessions_user_idx` ON `public_user_sessions` (`user_id`);

CREATE INDEX `public_user_sessions_expiry_idx` ON `public_user_sessions` (`expires_at`);

CREATE TABLE `public_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`email_verified_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX `public_users_email_uidx` ON `public_users` (`email`);

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

CREATE INDEX `service_records_user_idx` ON `service_records` (`user_id`,`created_at`);

CREATE INDEX `service_records_type_idx` ON `service_records` (`service_type`,`created_at`);

CREATE TABLE `service_settings` (
	`service_key` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`payment_required` integer DEFAULT false NOT NULL,
	`price_fils` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'KWD' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE `consultation_requests` ADD `user_id` text;

ALTER TABLE `contact_messages` ADD `user_id` text;

ALTER TABLE `public_users` ADD `status` text DEFAULT 'active' NOT NULL;

ALTER TABLE `public_users` ADD `memo_limit` integer DEFAULT 3 NOT NULL;

ALTER TABLE `public_users` ADD `assistant_limit` integer DEFAULT 20 NOT NULL;

CREATE TABLE `official_article_records` (
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

CREATE INDEX `official_articles_identity_idx` ON `official_article_records` (`law_number`,`law_year`,`article_number`);

CREATE INDEX `official_articles_status_idx` ON `official_article_records` (`status`);

CREATE TABLE `official_source_checks` (
	`source_url` text PRIMARY KEY NOT NULL,
	`document_id` integer NOT NULL,
	`source_sha256` text,
	`status` text NOT NULL,
	`checked_at` text NOT NULL,
	`metadata_json` text NOT NULL
);
-- SABEQ_OFFICIAL_ARTICLE_RECORDS
INSERT INTO official_source_checks (source_url,document_id,source_sha256,status,checked_at,metadata_json) VALUES ('https://moj.gov.kw/AR/Documents/MojDocs/%D9%82%D8%A7%D9%86%D9%88%D9%86%20%D8%B1%D9%82%D9%85%2014%20%D9%84%D8%B3%D9%86%D9%87%201973%20%D8%A8%D8%B4%D8%A3%D9%86%20%D8%A5%D9%86%D8%B4%D8%A7%D8%A1%20%D8%A7%D9%84%D9%85%D8%AD%D9%83%D9%85%D8%A9%20%D8%A7%D9%84%D8%AF%D8%B3%D8%AA%D9%88%D8%B1%D9%8A%D8%A9.pdf',2,'7f01cd5633ade4b701db0c130379ca9d442f8693fbeb76df98e658164d1a862a','unreadable_article_headings','2026-10-06T10:37:18.657355+00:00','{"documentId": 2, "title": "قانون رقم 14 لسنه 1973 بشأن إنشاء المحكمة الدستورية", "lawNumber": 14, "lawYear": 1973, "sourceUrl": "https://moj.gov.kw/AR/Documents/MojDocs/%D9%82%D8%A7%D9%86%D9%88%D9%86%20%D8%B1%D9%82%D9%85%2014%20%D9%84%D8%B3%D9%86%D9%87%201973%20%D8%A8%D8%B4%D8%A3%D9%86%20%D8%A5%D9%86%D8%B4%D8%A7%D8%A1%20%D8%A7%D9%84%D9%85%D8%AD%D9%83%D9%85%D8%A9%20%D8%A7%D9%84%D8%AF%D8%B3%D8%AA%D9%88%D8%B1%D9%8A%D8%A9.pdf", "checkedAt": "2026-10-06T10:37:18.657355+00:00", "status": "unreadable_article_headings", "sourceSha256": "7f01cd5633ade4b701db0c130379ca9d442f8693fbeb76df98e658164d1a862a", "pageCount": 9, "validityStatus": "pending_amendment_review"}') ON CONFLICT DO NOTHING;

CREATE TABLE `legislation_articles` (
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

CREATE INDEX `legislation_articles_source_idx` ON `legislation_articles` (`source_id`);

CREATE INDEX `legislation_articles_identity_idx` ON `legislation_articles` (`document_id`,`component_id`,`number`);

CREATE TABLE `legislation_imports` (
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

CREATE UNIQUE INDEX `legislation_import_sha_uidx` ON `legislation_imports` (`source_sha256`);

CREATE TABLE `legislation_pages` (
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

CREATE INDEX `legislation_pages_document_idx` ON `legislation_pages` (`document_id`);

CREATE TABLE `legislation_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`start_page` integer NOT NULL,
	`end_page` integer NOT NULL,
	`kind` text NOT NULL,
	`boundary_method` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `legislation_imports`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `legislation_sections_source_idx` ON `legislation_sections` (`source_id`);

CREATE TABLE `legislation_audit_reports` (
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

CREATE INDEX `legislation_reports_source_idx` ON `legislation_audit_reports` (`source_id`);

CREATE TABLE `legislation_currency_checks` (
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

CREATE INDEX `legislation_currency_review_idx` ON `legislation_currency_checks` (`review_id`);

CREATE TABLE `legislation_image_reviews` (
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

CREATE INDEX `legislation_image_review_idx` ON `legislation_image_reviews` (`review_id`);

CREATE TABLE `legislation_reviews` (
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

-- Synthetic service defaults for tests only.
INSERT INTO service_settings(service_key,enabled,payment_required,price_fils,currency) VALUES ('consultation',1,0,0,'KWD'),('assistant',1,0,0,'KWD'),('memo',1,0,0,'KWD'),('library',1,0,0,'KWD');
