-- Appointments are separate from legacy unscheduled consultation requests.
-- Apply this migration to the canonical D1 database before enabling bookings.
CREATE TABLE IF NOT EXISTS consultation_bookings (
  id TEXT PRIMARY KEY NOT NULL,
  slot_date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  case_type TEXT NOT NULL,
  preferred_contact TEXT NOT NULL DEFAULT 'WhatsApp',
  message TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'ar',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS consultation_bookings_slot_idx ON consultation_bookings (slot_date,slot_time,status);
CREATE INDEX IF NOT EXISTS consultation_bookings_status_idx ON consultation_bookings (status,created_at);

-- Separate editorial review state from the actual memo generation/payment status.
CREATE TABLE IF NOT EXISTS management_memo_reviews (
  memo_id TEXT PRIMARY KEY NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','needs_changes')),
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
