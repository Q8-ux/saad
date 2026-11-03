CREATE TABLE `public_user_credentials` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `public_users`(`id`) ON DELETE CASCADE,
  `username` text NOT NULL COLLATE NOCASE,
  `salt` text NOT NULL,
  `password_hash` text NOT NULL,
  `iterations` integer NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_user_credentials_username_idx` ON `public_user_credentials` (`username`);
