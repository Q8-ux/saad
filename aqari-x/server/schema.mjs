export const schema = `
CREATE TABLE IF NOT EXISTS office_users (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, phone text NOT NULL,
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('admin','broker','owner','buyer')),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS office_sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES office_users(id), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS office_sessions_expiry ON office_sessions(expires_at);
CREATE TABLE IF NOT EXISTS office_properties (
 id text PRIMARY KEY, owner_id text REFERENCES office_users(id), status text NOT NULL,
 fingerprint text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS office_properties_status ON office_properties(status,created_at DESC);
CREATE INDEX IF NOT EXISTS office_properties_owner ON office_properties(owner_id);
CREATE INDEX IF NOT EXISTS office_properties_fingerprint ON office_properties(fingerprint);
CREATE UNIQUE INDEX IF NOT EXISTS office_properties_unique_listing ON office_properties(fingerprint) WHERE status NOT IN ('archived','rejected');
CREATE TABLE IF NOT EXISTS office_settings (key text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS office_setup (id integer PRIMARY KEY CHECK(id=1), claimed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS office_requests (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES office_users(id), status text NOT NULL DEFAULT 'new',
 data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS office_requests_user ON office_requests(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS office_appointments (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES office_users(id), property_id text REFERENCES office_properties(id),
 slot timestamptz NOT NULL, status text NOT NULL DEFAULT 'requested', notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS office_appointment_slot ON office_appointments(slot) WHERE status IN ('requested','confirmed');
CREATE TABLE IF NOT EXISTS office_commissions (
 id text PRIMARY KEY, property_id text NOT NULL UNIQUE REFERENCES office_properties(id),
 final_price_fils bigint NOT NULL, amount_fils bigint NOT NULL, mode text NOT NULL, value text NOT NULL,
 agreement_ref text NOT NULL, status text NOT NULL DEFAULT 'due', receipt_ref text, created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz
);
CREATE TABLE IF NOT EXISTS office_files (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES office_users(id), property_id text REFERENCES office_properties(id),
 name text NOT NULL, mime text NOT NULL, content bytea NOT NULL, public boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS office_files_property ON office_files(property_id);
CREATE TABLE IF NOT EXISTS office_integrations (name text PRIMARY KEY, encrypted text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS office_audit (
 id bigserial PRIMARY KEY, actor_id text, action text NOT NULL, target_id text, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS office_rate_limits (key text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS office_events (day date NOT NULL, kind text NOT NULL, property_id text NOT NULL DEFAULT '', total bigint NOT NULL DEFAULT 0, PRIMARY KEY(day,kind,property_id));
CREATE TABLE IF NOT EXISTS office_saved_searches (id text PRIMARY KEY, user_id text NOT NULL REFERENCES office_users(id), label text NOT NULL, filters jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS office_jobs (id text PRIMARY KEY, actor_id text NOT NULL REFERENCES office_users(id), kind text NOT NULL, status text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
`;
export const defaultSettings = {
  officeName: "عقاري X",
  tagline: "مكتبك العقاري، بصورة أوضح.",
  contactName: "أبو مريم",
  phone: "96551758056",
  email: "",
  license: "",
  address: "الكويت",
  scheduleEnabled: false,
  scheduleDays: [0, 1, 2, 3, 4],
  scheduleStart: "09:00",
  scheduleEnd: "17:00",
  slotMinutes: 30,
  aiDailyLimit: 20,
};
