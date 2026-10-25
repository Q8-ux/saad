CREATE TABLE `user_access_policies` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `public_users`(`id`) ON DELETE CASCADE,
  `role` text DEFAULT 'user' NOT NULL,
  `permissions_json` text DEFAULT '{}' NOT NULL,
  `updated_by` text NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
