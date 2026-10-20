# Plan

## Context and constitution check
Reuse the public Sites Vinext/D1 backend, existing brand assets and React dependencies. Publish an independent buildless GitHub admin client in `sabeq-admin-preview/`. Leave the existing private admin Site audience intact. Data remains in server databases. No legal-source changes.

## Decisions
- Authenticate administrators with platform identity and an environment allowlist. Exchange a 60-second single-use authorization code bound to a client PKCE challenge for a short-lived server-revocable token. Browser keeps it in sessionStorage only. No credential in URLs after exchange.
- Management endpoints have explicit CORS, origin checks, bounded input, no-store responses and server authorization. Encrypt integration credentials with AES-GCM using the existing server auth secret.
- Add a durable memo-request ledger for guest and signed-in requests. Continue existing user records; surface both without double counting new records.
- Reuse contact and consultation tables. Add persisted admin commands, read state and integration event receipts. Email connector starts unconfigured and exposes a signed ingestion contract.
- OpenWA adapter follows pinned upstream API endpoints and HMAC signature contract. Gateway tests only read sessions. Start/QR/webhook registration are explicit admin actions.
- A bounded Render bridge records official-site operations on its existing backend and serves only authenticated management data. Unavailable bridge is a visible integration status.

## Files and verification
Backend: `lib/management*.ts`, `lib/memo-requests.ts`, `app/api/management/[...path]/route.ts`, integration routes, D1 migration, memo route. Client: `public/management/` copied to GitHub `sabeq-admin-preview/`. Official backend bridge: `legal-memo-platform/operations-monitor.js` and gateway registration.

Use synthetic D1/SQLite boundary tests for authorization, PKCE consumption, data isolation, encrypted credentials, webhook signatures/idempotency, guest memo capture and command updates. Build and typecheck existing backend; validate scoped Pages packaging. Preserve legal regression suites. Production checks must not create real client activity or send mail/WhatsApp messages.
