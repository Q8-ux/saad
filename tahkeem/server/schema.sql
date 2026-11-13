CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('owner','client')),
  password_hash text,
  enabled boolean NOT NULL DEFAULT true,
  access_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS single_owner ON accounts (role) WHERE role = 'owner';

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);

CREATE TABLE IF NOT EXISTS invitations (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS renewals (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  owner_id uuid NOT NULL REFERENCES accounts(id),
  months integer NOT NULL CHECK (months BETWEEN 1 AND 12),
  amount_fils integer NOT NULL CHECK (amount_fils > 0),
  payment_reference text NOT NULL UNIQUE,
  access_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS renewals_account ON renewals(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS references_catalog (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('law','article','judgment')),
  title text NOT NULL,
  category text NOT NULL,
  authority text NOT NULL,
  identity text NOT NULL,
  edition text NOT NULL,
  locator text NOT NULL,
  summary text NOT NULL,
  source_url text NOT NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memos (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  memo_type text NOT NULL,
  case_number text NOT NULL DEFAULT '',
  input jsonb NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  body text NOT NULL,
  method text NOT NULL CHECK (method IN ('template','model','manual')),
  status text NOT NULL DEFAULT 'review' CHECK (status IN ('review','approved','archived')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memos_account ON memos(account_id, updated_at DESC);


CREATE TABLE IF NOT EXISTS corpus_articles (
  id text PRIMARY KEY,
  document_id text NOT NULL,
  component_id text NOT NULL,
  article_number text NOT NULL,
  number_key text NOT NULL,
  document_title text NOT NULL,
  heading text NOT NULL,
  start_page integer NOT NULL,
  end_page integer NOT NULL,
  printed_page text,
  text text NOT NULL,
  text_sha256 text NOT NULL,
  source_sha256 text NOT NULL,
  boundary_review text NOT NULL,
  text_verified boolean NOT NULL,
  source_issue text NOT NULL DEFAULT '',
  searchable text NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple',searchable)) STORED
);
CREATE INDEX IF NOT EXISTS corpus_articles_terms ON corpus_articles USING gin(search_vector);
CREATE INDEX IF NOT EXISTS corpus_articles_number ON corpus_articles(number_key);
CREATE INDEX IF NOT EXISTS corpus_articles_page ON corpus_articles(start_page,id);

CREATE TABLE IF NOT EXISTS corpus_imports (
  source_sha256 text PRIMARY KEY,
  article_count integer NOT NULL,
  page_count integer NOT NULL,
  section_count integer NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
