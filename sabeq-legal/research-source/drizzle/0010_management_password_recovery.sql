CREATE TABLE `management_password_resets` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX `management_password_resets_account_idx` ON `management_password_resets` (`account_id`);
