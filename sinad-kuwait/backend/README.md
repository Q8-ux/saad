# Manhaj school account service

## Local check
Requires Node 24+. SQLite is built into Node and used only for local testing.

```
node --test sinad-kuwait/backend/server.test.mjs
SQLITE_PATH=/absolute/private/path/manhaj.sqlite node sinad-kuwait/backend/server.mjs
```

Cloud startup refuses SQLite. Set DATABASE_URL to a dedicated PostgreSQL database and install backend/package.json dependencies. PostgreSQL deployment has not been run in this session; local integration checks use SQLite.

## Render preparation
The backend/render.yaml file describes a free trial service and a dedicated free PostgreSQL database. It has not been applied. Select the authorized workspace before creating resources. A free database expires after 30 days and does not offer managed backups; arrange durable storage before using real school records. https://render.com/docs/free

Build: npm --prefix sinad-kuwait/backend install --omit=dev
Start: node sinad-kuwait/backend/server.mjs
NODE_VERSION=24
ALLOWED_ORIGIN=https://q8-ux.github.io
DATABASE_URL=server-side-only secret, never commit it.

## Interfaces
POST /api/auth/register: new school owner account, email + password >=12 characters. Email delivery and account recovery are not configured.
POST /api/auth/login: 12-hour opaque session token; hash stored in database.
POST /api/auth/logout: revoke session.
GET /api/state: authenticated owner school only.
PUT /api/state: validate state and require matching revision; conflict returns 409.
POST /api/cards: create a random one-use card link, seven-day expiry, only for an event already saved in this school.
GET /api/cards/{token}: minimal teacher card data and curriculum reference; no access to the school's other events or files.
POST /api/cards/{token}: update execution, submit up to three validated image/PDF files (5MB each); mark executed, not approved; consume card atomically.
GET /api/files/{id}: authenticated school owner only.
GET /api/audit: recent account actions, owner school only.

## Data flows and boundaries
Frontend local records upload only when the user clicks cloud save. IndexedDB files are not automatically copied; teacher card uploads are stored in the database and marked cloud=true. Browser accounts use sessionStorage; public card calls never include an account bearer token. Share URLs to a different API do not overwrite an already configured account origin.

School ID comes from the authenticated session, never from client-provided tenant identifiers. SQL parameters are bound. Passwords use PBKDF2 SHA256 with per-user salt. Session/card token hashes are persisted. Rate limiting is per backend instance; distributed rate limiting, verified emails, password recovery, school staff roles, operational backup/restore and billing require further production work. A self-registered account does not verify official ownership of a school. No subscription fees are charged.
