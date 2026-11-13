import { readFile } from 'node:fs/promises';
import pg from 'pg';

const schemaPath = new URL('./schema.sql', import.meta.url);

export async function initialize(store) {
  const schema = await readFile(schemaPath, 'utf8');
  await store.transaction(async db => {
    await db.query("SELECT pg_advisory_xact_lock(213678500)");
    await (db.exec ? db.exec(schema) : db.query(schema));
    await db.query("DELETE FROM sessions WHERE expires_at <= now()");
    await db.query("DELETE FROM invitations WHERE expires_at <= now()");
    await db.query("DELETE FROM auth_limits WHERE window_start < now() - interval '1 day'");
  });
}

export function postgresStore(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 8, connectionTimeoutMillis: 12_000,
    idleTimeoutMillis: 25_000, statement_timeout: 12_000 });
  pool.on('error', () => console.error('Database connection interrupted'));
  return {
    query: (sql, args) => pool.query(sql, args),
    close: () => pool.end(),
    async transaction(callback) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export async function one(db, sql, args = []) {
  const result = await db.query(sql, args);
  return result.rows[0];
}
