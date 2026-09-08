PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenant_whatsapp_accounts (
  office_id TEXT PRIMARY KEY NOT NULL,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT NOT NULL DEFAULT '',
  display_phone_number TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT 'واتساب المكتب',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_whatsapp_accounts_phone_unique ON tenant_whatsapp_accounts(phone_number_id);

CREATE TABLE IF NOT EXISTS tenant_whatsapp_conversations (
  id TEXT PRIMARY KEY NOT NULL,
  office_id TEXT NOT NULL,
  wa_id TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  client_id INTEGER,
  case_id INTEGER,
  last_message_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_preview TEXT NOT NULL DEFAULT '',
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES tenant_clients(id) ON DELETE SET NULL,
  FOREIGN KEY (case_id) REFERENCES tenant_cases(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_whatsapp_conversation_unique ON tenant_whatsapp_conversations(office_id, wa_id);
CREATE INDEX IF NOT EXISTS tenant_whatsapp_conversation_recent_idx ON tenant_whatsapp_conversations(office_id, last_message_at);

CREATE TABLE IF NOT EXISTS tenant_whatsapp_messages (
  id TEXT PRIMARY KEY NOT NULL,
  office_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  provider_message_id TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  error_code TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  sent_by_user_id TEXT,
  provider_timestamp TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES tenant_whatsapp_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_whatsapp_provider_message_unique ON tenant_whatsapp_messages(provider_message_id) WHERE provider_message_id<>'';
CREATE INDEX IF NOT EXISTS tenant_whatsapp_messages_conversation_idx ON tenant_whatsapp_messages(conversation_id, created_at);
