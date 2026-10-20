CREATE TABLE `sadad_payments` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `sadad_invoice_uidx` ON `sadad_payments` (`environment`,`invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sadad_transaction_uidx` ON `sadad_payments` (`environment`,`transaction_id`);