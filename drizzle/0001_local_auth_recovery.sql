PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique ON app_users(email);
CREATE INDEX IF NOT EXISTS app_users_status_idx ON app_users(status);

CREATE TABLE IF NOT EXISTS local_login_credentials (
  user_id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  is_platform_admin INTEGER NOT NULL DEFAULT 0,
  initial_office_name TEXT NOT NULL DEFAULT '',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS local_login_credentials_username_unique ON local_login_credentials(username);
CREATE INDEX IF NOT EXISTS local_login_credentials_lock_idx ON local_login_credentials(locked_until);

CREATE TABLE IF NOT EXISTS local_login_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS local_login_sessions_token_unique ON local_login_sessions(token_hash);
CREATE INDEX IF NOT EXISTS local_login_sessions_user_expiry_idx ON local_login_sessions(user_id, expires_at);
