CREATE TABLE IF NOT EXISTS social_campaigns(id text PRIMARY KEY, data jsonb NOT NULL, revision integer NOT NULL DEFAULT 0, lock_token text, lease_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
CREATE TABLE IF NOT EXISTS social_events(id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), title text NOT NULL, message text NOT NULL, agent integer NOT NULL DEFAULT -1, campaign_id text);
CREATE TABLE IF NOT EXISTS social_config(id text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS social_quotas(id text PRIMARY KEY, n integer NOT NULL DEFAULT 0);
