CREATE TABLE `radar_documents` (
	`owner` text NOT NULL,
	`key` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `key`)
);
