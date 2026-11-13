import { createApp } from './app.mjs';
import { modelFromEnvironment } from './memos.mjs';
import { initialize, postgresStore } from './store.mjs';

const env = process.env;
const port = Number(env.PORT ?? 3000);
const production = env.NODE_ENV === 'production';
const site = new URL(env.APP_ORIGIN || env.RENDER_EXTERNAL_URL || `http://localhost:${port}`);
if (production && site.protocol !== 'https:') throw Error('Production requires a verified HTTPS APP_ORIGIN.');
if (!env.DATABASE_URL) throw Error('DATABASE_URL is required.');
if (env.TAHKEEM_SETUP_TOKEN_SHA256 && !/^[a-f0-9]{64}$/.test(env.TAHKEEM_SETUP_TOKEN_SHA256)) {
  throw Error('Invalid TAHKEEM_SETUP_TOKEN_SHA256.');
}
const db = postgresStore(env.DATABASE_URL);
await initialize(db);
const app = createApp({ db, origin: site.origin, model: modelFromEnvironment(env),
  setupHash: env.TAHKEEM_SETUP_TOKEN_SHA256, trustProxy: production && Boolean(env.RENDER) });
const server = app.listen(port, '0.0.0.0', () => console.log(`Tahkeem listening on port ${port}`));

function stop() {
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
