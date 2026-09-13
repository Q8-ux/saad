'use strict';

const fs = require('node:fs');
const path = require('node:path');

const schema = `
CREATE TABLE IF NOT EXISTS commerce_users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS commerce_identities (
  identity TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES commerce_users(id),
  kind TEXT NOT NULL, contact TEXT NOT NULL, verified_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS commerce_challenges (
  id TEXT PRIMARY KEY, identity TEXT NOT NULL, name TEXT NOT NULL, channel TEXT NOT NULL,
  contact TEXT NOT NULL, code_hash TEXT NOT NULL, provider_id TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS commerce_challenge_identity ON commerce_challenges(identity, created_at);
CREATE TABLE IF NOT EXISTS commerce_sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES commerce_users(id),
  role TEXT NOT NULL DEFAULT 'customer', expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS commerce_limits (
  id TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS commerce_settings (
  name TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS commerce_orders (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES commerce_users(id),
  request_key TEXT NOT NULL, draft_hash TEXT NOT NULL, draft TEXT NOT NULL,
  amount_fils INTEGER NOT NULL CHECK (amount_fils > 0), currency TEXT NOT NULL DEFAULT 'KWD',
  payment_status TEXT NOT NULL DEFAULT 'unpaid', generation_status TEXT NOT NULL DEFAULT 'waiting',
  provider TEXT NOT NULL DEFAULT '', environment TEXT NOT NULL DEFAULT '',
  invoice_id TEXT UNIQUE, checkout_url TEXT, checkout_started_at BIGINT,
  paid_at BIGINT, payment_reference TEXT, generation_token TEXT,
  generation_started_at BIGINT, generation_attempts INTEGER NOT NULL DEFAULT 0,
  result TEXT, last_error TEXT, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
  UNIQUE(user_id, request_key)
);
CREATE INDEX IF NOT EXISTS commerce_orders_owner ON commerce_orders(user_id, created_at);
CREATE TABLE IF NOT EXISTS commerce_files (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES commerce_users(id), draft_id TEXT NOT NULL,
  order_id TEXT REFERENCES commerce_orders(id), file_hash TEXT NOT NULL,
  name TEXT NOT NULL, mime TEXT NOT NULL, size_bytes INTEGER NOT NULL,
  content TEXT NOT NULL, created_at BIGINT NOT NULL,
  UNIQUE(user_id, draft_id, file_hash)
);
CREATE TABLE IF NOT EXISTS commerce_order_files (
  order_id TEXT NOT NULL REFERENCES commerce_orders(id),
  file_id TEXT NOT NULL REFERENCES commerce_files(id), PRIMARY KEY(order_id, file_id)
);
CREATE TABLE IF NOT EXISTS commerce_audit (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
  order_id TEXT, detail TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS commerce_refunds (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES commerce_orders(id),
  user_id TEXT NOT NULL REFERENCES commerce_users(id), reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested', provider_reference TEXT,
  created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL
);
`;

async function createStore(env, directory) {
  if (env.SABEQ_DATABASE_URL) {
    const { Pool } = require('pg');
    // pg verifies TLS certificates; never disable verification for production.
    const pool = new Pool({ connectionString: env.SABEQ_DATABASE_URL, max: 6, connectionTimeoutMillis: 10000 });
    await pool.query(schema);
    return {
      durable: true, kind: 'postgres',
      query: (sql, args = []) => pool.query(sql, args),
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn({ query: (sql, args = []) => client.query(sql, args), lock: ' FOR UPDATE' });
          await client.query('COMMIT');
          return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
      close: () => pool.end(),
    };
  }
  if (env.RENDER === 'true' || env.NODE_ENV === 'production') {
    throw new Error('SABEQ_DATABASE_URL is required in production; temporary SQLite storage is refused');
  }
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(directory, 'commerce.sqlite'));
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(schema);
  function query(sql, args = []) {
    const ordered = [];
    const converted = sql.replace(/\$(\d+)/g, (_, index) => { ordered.push(args[Number(index) - 1]); return '?'; });
    const statement = db.prepare(converted);
    if (/^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql)) {
      const rows = statement.all(...ordered);
      return { rows, rowCount: rows.length };
    }
    const result = statement.run(...ordered);
    return { rows: [], rowCount: Number(result.changes) };
  }
  // Serialize both reads and transactions: reads must never observe uncommitted changes.
  let queue = Promise.resolve();
  function exclusive(fn) {
    const next = queue.then(fn);
    queue = next.catch(() => {});
    return next;
  }
  return {
    durable: false, kind: 'sqlite-development',
    query: (sql, args) => exclusive(() => query(sql, args)),
    transaction: fn => exclusive(async () => {
      db.exec('BEGIN IMMEDIATE');
      try { const result = await fn({ query, lock: '' }); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }),
    close: () => exclusive(() => db.close()),
  };
}

module.exports = { createStore };
